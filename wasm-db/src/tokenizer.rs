//! Text tokenization for indexing and matching

use unicode_segmentation::UnicodeSegmentation;

/// Tokenize text into lowercase words for indexing
pub fn tokenize(text: &str) -> Vec<String> {
    text.unicode_words()
        .filter(|w| w.len() > 1)
        .map(|w| w.to_lowercase())
        .collect()
}

/// Normalize text for comparison (lowercase, trim whitespace)
pub fn normalize(text: &str) -> String {
    text.trim().to_lowercase()
}

/// Calculate Levenshtein distance between two strings
pub fn levenshtein(a: &str, b: &str) -> usize {
    let a_chars: Vec<char> = a.chars().collect();
    let b_chars: Vec<char> = b.chars().collect();
    let a_len = a_chars.len();
    let b_len = b_chars.len();

    if a_len == 0 {
        return b_len;
    }
    if b_len == 0 {
        return a_len;
    }

    let mut matrix = vec![vec![0usize; b_len + 1]; a_len + 1];

    for i in 0..=a_len {
        matrix[i][0] = i;
    }
    for j in 0..=b_len {
        matrix[0][j] = j;
    }

    for i in 1..=a_len {
        for j in 1..=b_len {
            let cost = if a_chars[i - 1] == b_chars[j - 1] { 0 } else { 1 };
            matrix[i][j] = (matrix[i - 1][j] + 1)
                .min(matrix[i][j - 1] + 1)
                .min(matrix[i - 1][j - 1] + cost);
        }
    }

    matrix[a_len][b_len]
}

/// Calculate fuzzy match score (0.0 - 1.0)
pub fn fuzzy_score(query: &str, target: &str) -> f64 {
    let q = normalize(query);
    let t = normalize(target);

    // Exact match
    if t == q {
        return 1.0;
    }

    // Contains
    if t.contains(&q) {
        return 0.9;
    }

    // Token overlap
    let q_tokens = tokenize(&q);
    let t_tokens = tokenize(&t);
    
    if q_tokens.is_empty() {
        return 0.0;
    }

    let overlap = q_tokens.iter()
        .filter(|qt| t_tokens.iter().any(|tt| tt.contains(qt.as_str()) || qt.contains(tt.as_str())))
        .count();
    let token_score = overlap as f64 / q_tokens.len() as f64;

    // Levenshtein-based similarity (on truncated target)
    let t_truncated: String = t.chars().take(q.len() + 10).collect();
    let distance = levenshtein(&q, &t_truncated);
    let max_len = q.len().max(t_truncated.len());
    let lev_score = if max_len > 0 {
        1.0 - (distance as f64 / max_len as f64)
    } else {
        0.0
    };

    (token_score * 0.7).max(lev_score * 0.5)
}

/// Check if text matches pattern using specified match type
pub fn match_text(text: &str, patterns: &[String], match_type: &str) -> bool {
    let text_lower = normalize(text);
    
    for pattern in patterns {
        let pattern_lower = normalize(pattern);
        
        match match_type {
            "exact" => {
                if text_lower == pattern_lower {
                    return true;
                }
            }
            "contains" => {
                if text_lower.contains(&pattern_lower) {
                    return true;
                }
            }
            "fuzzy" => {
                if fuzzy_score(&pattern_lower, &text_lower) > 0.5 {
                    return true;
                }
            }
            "regex" => {
                // Fallback to contains for regex (full regex would add dependencies)
                if text_lower.contains(&pattern_lower) {
                    return true;
                }
            }
            _ => {
                if text_lower.contains(&pattern_lower) {
                    return true;
                }
            }
        }
    }
    
    false
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tokenize() {
        let tokens = tokenize("Hello World! This is a test.");
        assert!(tokens.contains(&"hello".to_string()));
        assert!(tokens.contains(&"world".to_string()));
        assert!(tokens.contains(&"test".to_string()));
        assert!(!tokens.contains(&"a".to_string())); // Too short
    }

    #[test]
    fn test_fuzzy_score() {
        assert_eq!(fuzzy_score("login", "login"), 1.0);
        assert!(fuzzy_score("login", "Login Button") > 0.8);
        // Typo matching - Levenshtein distance of 1 on 4-char query
        assert!(fuzzy_score("logn", "login") > 0.3);
    }
}
