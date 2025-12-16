//! Core type definitions mirroring the TypeScript SDK types

use serde::{Deserialize, Serialize};

/// Element role categories
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ElementRole {
    Button,
    Link,
    Textbox,
    Checkbox,
    Radio,
    Combobox,
    Listbox,
    Option,
    Menu,
    Menuitem,
    Tab,
    Tabpanel,
    Dialog,
    Alertdialog,
    Switch,
    Slider,
    Spinbutton,
    Searchbox,
    Heading,
    Image,
    Navigation,
    Main,
    Region,
    Form,
    Grid,
    Gridcell,
    Row,
    Rowgroup,
    Cell,
    Columnheader,
    Rowheader,
    Tree,
    Treeitem,
    Tooltip,
    Status,
    Alert,
    Progressbar,
    Separator,
    Group,
    Article,
    Generic,
}

/// State flags as bitfield constants
pub mod state_flags {
    pub const VISIBLE: u32 = 1 << 0;
    pub const ENABLED: u32 = 1 << 1;
    pub const CHECKED: u32 = 1 << 2;
    pub const EXPANDED: u32 = 1 << 3;
    pub const FOCUSED: u32 = 1 << 4;
    pub const SELECTED: u32 = 1 << 5;
    pub const PRESSED: u32 = 1 << 6;
    pub const READONLY: u32 = 1 << 7;
    pub const REQUIRED: u32 = 1 << 8;
    pub const INVALID: u32 = 1 << 9;
    pub const BUSY: u32 = 1 << 10;
    pub const HIDDEN: u32 = 1 << 11;
    pub const DISABLED: u32 = 1 << 12;
}

/// Bounding rectangle
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Rect {
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
}

/// Node record representing a UI element
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NodeRecord {
    pub id: u32,
    pub frame_id: u16,
    pub role: ElementRole,
    pub name: String,
    pub state_bits: u32,
    #[serde(default)]
    pub attrs: std::collections::HashMap<String, String>,
    #[serde(default)]
    pub context: Vec<String>,
    pub rect: Rect,
    pub fingerprint: String,
    pub tag_name: String,
}

/// Match type for text filtering
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum MatchType {
    Exact,
    Contains,
    Fuzzy,
    Regex,
}

/// Query filter clauses
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum WhereClause {
    Role { role: RoleValue },
    State { state: StateFilter },
    Name { name: TextFilter },
    Context { in_context: TextFilter },
    Attr { attr: AttrFilter },
    Near { near: NearFilter },
    Nth { nth: usize },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum RoleValue {
    Single(ElementRole),
    Multiple(Vec<ElementRole>),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StateFilter {
    #[serde(default)]
    pub visible: Option<bool>,
    #[serde(default)]
    pub enabled: Option<bool>,
    #[serde(default)]
    pub checked: Option<bool>,
    #[serde(default)]
    pub expanded: Option<bool>,
    #[serde(default)]
    pub focused: Option<bool>,
    #[serde(default)]
    pub selected: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TextFilter {
    #[serde(rename = "match")]
    pub match_type: MatchType,
    pub value: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AttrFilter {
    pub name: String,
    pub value: String,
    #[serde(rename = "match", default)]
    pub match_type: Option<MatchType>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NearFilter {
    #[serde(default)]
    pub target_id: Option<u32>,
    #[serde(default)]
    pub text: Option<String>,
    #[serde(default = "default_radius")]
    pub radius: f64,
}

fn default_radius() -> f64 {
    200.0
}

/// Order by specification
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrderBy {
    #[serde(default)]
    pub field: Option<String>,
    #[serde(default)]
    pub direction: Option<String>,
}

/// Query AST structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueryAST {
    #[serde(default)]
    pub select: Option<String>,
    pub r#where: Vec<WhereClause>,
    #[serde(default)]
    pub order_by: Option<Vec<OrderBy>>,
    #[serde(default)]
    pub limit: Option<usize>,
    #[serde(default)]
    pub offset: Option<usize>,
}

/// Actionability flags for an element
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Actionability {
    pub click: bool,
    pub r#type: bool,
    pub check: bool,
    pub select: bool,
    pub scroll: bool,
}

/// States included in match result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MatchStates {
    pub visible: bool,
    pub enabled: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub checked: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub expanded: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub focused: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub selected: Option<bool>,
}

/// Single match result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MatchResult {
    pub id: u32,
    pub score: f64,
    pub role: ElementRole,
    pub name: String,
    pub states: MatchStates,
    pub context: Vec<String>,
    pub actionability: Actionability,
    pub rect: Rect,
}

/// Query execution explanation
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QueryExplain {
    pub candidates_considered: usize,
    pub filters_applied: Vec<String>,
    pub execution_time_ms: f64,
}

/// Full query result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueryResult {
    pub matches: Vec<MatchResult>,
    pub total: usize,
    pub explain: QueryExplain,
}
