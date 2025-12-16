//! Query parsing and execution

use rustc_hash::{FxHashMap, FxHashSet};
use crate::types::*;
use crate::types::state_flags::*;
use crate::db::UiDatabase;
use crate::tokenizer::{fuzzy_score, match_text};

/// Query executor that operates on a database
pub struct QueryExecutor<'a> {
    db: &'a UiDatabase,
    synonyms: &'a FxHashMap<String, Vec<String>>,
}

impl<'a> QueryExecutor<'a> {
    pub fn new(db: &'a UiDatabase, synonyms: &'a FxHashMap<String, Vec<String>>) -> Self {
        QueryExecutor { db, synonyms }
    }

    /// Execute a query and return results
    pub fn execute(&self, query: &QueryAST) -> Result<QueryResult, String> {
        let start = web_sys::window()
            .and_then(|w| w.performance())
            .map(|p| p.now())
            .unwrap_or(0.0);

        let mut filters_applied: Vec<String> = Vec::new();
        let records = self.db.records();
        
        // Start with all indices
        let mut candidates: FxHashSet<usize> = (0..records.len()).collect();
        let mut first_filter = true;

        // Apply filters
        for clause in &query.r#where {
            let filtered = self.apply_filter(clause, &mut filters_applied)?;
            
            if first_filter {
                candidates = filtered;
                first_filter = false;
            } else {
                candidates = candidates.intersection(&filtered).copied().collect();
            }
        }

        // Score candidates
        let mut scored: Vec<(usize, f64)> = candidates
            .into_iter()
            .map(|idx| {
                let score = self.score_candidate(idx, query);
                (idx, score)
            })
            .collect();

        // Sort by score (desc) or other criteria
        if let Some(order_by) = &query.order_by {
            if let Some(order) = order_by.first() {
                let field = order.field.as_deref().unwrap_or("score");
                let desc = order.direction.as_deref() != Some("asc");
                
                match field {
                    "score" => {
                        if desc {
                            scored.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
                        } else {
                            scored.sort_by(|a, b| a.1.partial_cmp(&b.1).unwrap_or(std::cmp::Ordering::Equal));
                        }
                    }
                    "y" => {
                        if desc {
                            scored.sort_by(|a, b| records[b.0].rect.y.cmp(&records[a.0].rect.y));
                        } else {
                            scored.sort_by(|a, b| records[a.0].rect.y.cmp(&records[b.0].rect.y));
                        }
                    }
                    "x" => {
                        if desc {
                            scored.sort_by(|a, b| records[b.0].rect.x.cmp(&records[a.0].rect.x));
                        } else {
                            scored.sort_by(|a, b| records[a.0].rect.x.cmp(&records[b.0].rect.x));
                        }
                    }
                    _ => {
                        scored.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
                    }
                }
            }
        } else {
            // Default: sort by score desc
            scored.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
        }

        let total = scored.len();

        // Apply offset and limit
        let offset = query.offset.unwrap_or(0);
        let limit = query.limit.unwrap_or(10);
        let paginated: Vec<_> = scored.into_iter().skip(offset).take(limit).collect();

        // Convert to MatchResults
        let matches: Vec<MatchResult> = paginated
            .into_iter()
            .map(|(idx, score)| self.record_to_match(&records[idx], score))
            .collect();

        let end = web_sys::window()
            .and_then(|w| w.performance())
            .map(|p| p.now())
            .unwrap_or(0.0);

        Ok(QueryResult {
            matches,
            total,
            explain: QueryExplain {
                candidates_considered: total,
                filters_applied,
                execution_time_ms: end - start,
            },
        })
    }

    /// Apply a single filter clause
    fn apply_filter(&self, clause: &WhereClause, filters_applied: &mut Vec<String>) -> Result<FxHashSet<usize>, String> {
        let records = self.db.records();
        let mut result = FxHashSet::default();

        match clause {
            WhereClause::Role { role } => {
                let roles = match role {
                    RoleValue::Single(r) => vec![*r],
                    RoleValue::Multiple(rs) => rs.clone(),
                };
                
                let role_names: Vec<String> = roles.iter().map(|r| format!("{:?}", r).to_lowercase()).collect();
                filters_applied.push(format!("role={}", role_names.join("|")));
                
                for r in roles {
                    if let Some(indices) = self.db.role_index().get(&r) {
                        result.extend(indices.iter().copied());
                    }
                }
            }

            WhereClause::State { state } => {
                let mut state_names = Vec::new();
                
                for (idx, record) in records.iter().enumerate() {
                    let mut matches = true;
                    
                    if let Some(visible) = state.visible {
                        let is_visible = (record.state_bits & VISIBLE) != 0;
                        if is_visible != visible {
                            matches = false;
                        }
                        state_names.push(format!("visible={}", visible));
                    }
                    if let Some(enabled) = state.enabled {
                        let is_enabled = (record.state_bits & ENABLED) != 0;
                        if is_enabled != enabled {
                            matches = false;
                        }
                        state_names.push(format!("enabled={}", enabled));
                    }
                    if let Some(checked) = state.checked {
                        let is_checked = (record.state_bits & CHECKED) != 0;
                        if is_checked != checked {
                            matches = false;
                        }
                    }
                    if let Some(expanded) = state.expanded {
                        let is_expanded = (record.state_bits & EXPANDED) != 0;
                        if is_expanded != expanded {
                            matches = false;
                        }
                    }
                    if let Some(focused) = state.focused {
                        let is_focused = (record.state_bits & FOCUSED) != 0;
                        if is_focused != focused {
                            matches = false;
                        }
                    }
                    if let Some(selected) = state.selected {
                        let is_selected = (record.state_bits & SELECTED) != 0;
                        if is_selected != selected {
                            matches = false;
                        }
                    }
                    
                    if matches {
                        result.insert(idx);
                    }
                }
                
                state_names.dedup();
                filters_applied.push(format!("state({})", state_names.join(",")));
            }

            WhereClause::Name { name } => {
                let match_type_str = match name.match_type {
                    MatchType::Exact => "exact",
                    MatchType::Contains => "contains",
                    MatchType::Fuzzy => "fuzzy",
                    MatchType::Regex => "regex",
                };
                filters_applied.push(format!("name({}:{})", match_type_str, &name.value));
                
                // Split by pipe for alternatives
                let mut patterns: Vec<String> = name.value.split('|')
                    .map(|s| s.trim().to_lowercase())
                    .collect();
                
                // Expand with synonyms
                for pattern in patterns.clone() {
                    if let Some(syns) = self.synonyms.get(&pattern) {
                        patterns.extend(syns.clone());
                    }
                }
                
                for (idx, record) in records.iter().enumerate() {
                    if match_text(&record.name, &patterns, match_type_str) {
                        result.insert(idx);
                    }
                }
            }

            WhereClause::Context { in_context } => {
                let match_type_str = match in_context.match_type {
                    MatchType::Exact => "exact",
                    MatchType::Contains => "contains",
                    MatchType::Fuzzy => "fuzzy",
                    MatchType::Regex => "regex",
                };
                filters_applied.push(format!("context({}:{})", match_type_str, &in_context.value));
                
                let patterns: Vec<String> = in_context.value.split('|')
                    .map(|s| s.trim().to_lowercase())
                    .collect();
                
                for (idx, record) in records.iter().enumerate() {
                    let context_text = record.context.join(" ");
                    if match_text(&context_text, &patterns, match_type_str) {
                        result.insert(idx);
                    }
                }
            }

            WhereClause::Attr { attr } => {
                let match_type_str = attr.match_type.map(|m| match m {
                    MatchType::Exact => "exact",
                    MatchType::Contains => "contains",
                    MatchType::Fuzzy => "fuzzy",
                    MatchType::Regex => "regex",
                }).unwrap_or("exact");
                
                filters_applied.push(format!("attr({}={})", &attr.name, &attr.value));
                
                for (idx, record) in records.iter().enumerate() {
                    if let Some(attr_value) = record.attrs.get(&attr.name) {
                        if match_text(attr_value, &[attr.value.clone()], match_type_str) {
                            result.insert(idx);
                        }
                    }
                }
            }

            WhereClause::Near { near } => {
                filters_applied.push(format!("near({:?}, r={})", near.target_id.or(near.text.as_ref().map(|_| 0)), near.radius));
                
                let target_center = if let Some(target_id) = near.target_id {
                    records.iter().find(|r| r.id == target_id).map(|r| {
                        let cx = r.rect.x as f64 + r.rect.width as f64 / 2.0;
                        let cy = r.rect.y as f64 + r.rect.height as f64 / 2.0;
                        (cx, cy)
                    })
                } else if let Some(text) = &near.text {
                    let text_lower = text.to_lowercase();
                    records.iter().find(|r| r.name.to_lowercase().contains(&text_lower)).map(|r| {
                        let cx = r.rect.x as f64 + r.rect.width as f64 / 2.0;
                        let cy = r.rect.y as f64 + r.rect.height as f64 / 2.0;
                        (cx, cy)
                    })
                } else {
                    None
                };
                
                if let Some((tx, ty)) = target_center {
                    for (idx, record) in records.iter().enumerate() {
                        let cx = record.rect.x as f64 + record.rect.width as f64 / 2.0;
                        let cy = record.rect.y as f64 + record.rect.height as f64 / 2.0;
                        let distance = ((cx - tx).powi(2) + (cy - ty).powi(2)).sqrt();
                        
                        if distance <= near.radius {
                            result.insert(idx);
                        }
                    }
                }
            }

            WhereClause::Nth { nth: _ } => {
                filters_applied.push("nth".to_string());
                // Return all, nth is applied post-filter
                result.extend(0..records.len());
            }
        }

        Ok(result)
    }

    /// Score a candidate based on query matching
    fn score_candidate(&self, idx: usize, query: &QueryAST) -> f64 {
        let record = &self.db.records()[idx];
        let mut score = 0.5; // Base score

        for clause in &query.r#where {
            match clause {
                WhereClause::Name { name } => {
                    let name_score = fuzzy_score(&name.value, &record.name);
                    score += name_score * 0.3;
                }
                WhereClause::Context { in_context } => {
                    let context_text = record.context.join(" ");
                    let context_score = fuzzy_score(&in_context.value, &context_text);
                    score += context_score * 0.2;
                }
                WhereClause::Role { role } => {
                    let roles = match role {
                        RoleValue::Single(r) => vec![*r],
                        RoleValue::Multiple(rs) => rs.clone(),
                    };
                    if roles.contains(&record.role) {
                        score += 0.1;
                    }
                }
                WhereClause::State { .. } => {
                    score += 0.05;
                }
                _ => {}
            }
        }

        // Boost for data-testid
        if record.attrs.contains_key("data-testid") {
            score += 0.1;
        }

        // Boost for upper viewport position
        if record.rect.y < 300 {
            score += 0.05;
        }

        score.min(1.0)
    }

    /// Convert NodeRecord to MatchResult
    fn record_to_match(&self, record: &NodeRecord, score: f64) -> MatchResult {
        let is_visible = (record.state_bits & VISIBLE) != 0;
        let is_enabled = (record.state_bits & ENABLED) != 0;
        let actionable = is_visible && is_enabled;

        let clickable_roles = [
            ElementRole::Button, ElementRole::Link, ElementRole::Tab,
            ElementRole::Menuitem, ElementRole::Option, ElementRole::Checkbox,
            ElementRole::Radio, ElementRole::Switch,
        ];
        
        let typeable_roles = [
            ElementRole::Textbox, ElementRole::Searchbox,
            ElementRole::Combobox, ElementRole::Spinbutton,
        ];
        
        let checkable_roles = [
            ElementRole::Checkbox, ElementRole::Radio, ElementRole::Switch,
        ];
        
        let selectable_roles = [
            ElementRole::Option, ElementRole::Tab,
            ElementRole::Treeitem, ElementRole::Gridcell,
        ];

        MatchResult {
            id: record.id,
            score: (score * 100.0).round() / 100.0,
            role: record.role,
            name: record.name.clone(),
            states: MatchStates {
                visible: is_visible,
                enabled: is_enabled,
                checked: if (record.state_bits & CHECKED) != 0 { Some(true) } else { None },
                expanded: if (record.state_bits & EXPANDED) != 0 { Some(true) } else { None },
                focused: if (record.state_bits & FOCUSED) != 0 { Some(true) } else { None },
                selected: if (record.state_bits & SELECTED) != 0 { Some(true) } else { None },
            },
            context: record.context.clone(),
            actionability: Actionability {
                click: actionable && clickable_roles.contains(&record.role),
                r#type: actionable && typeable_roles.contains(&record.role),
                check: actionable && checkable_roles.contains(&record.role),
                select: actionable && selectable_roles.contains(&record.role),
                scroll: is_visible,
            },
            rect: record.rect.clone(),
        }
    }
}
