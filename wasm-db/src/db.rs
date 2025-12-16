//! Core database implementation with indexing and query execution

use rustc_hash::FxHashMap;
use crate::types::*;
use crate::tokenizer::tokenize;
use crate::query::QueryExecutor;

/// Main UI Database with columnar storage and indices
pub struct UiDatabase {
    /// All records in columnar layout
    records: Vec<NodeRecord>,
    
    /// Role -> record indices
    role_index: FxHashMap<ElementRole, Vec<usize>>,
    
    /// Token -> record indices (inverted index for name/context)
    token_index: FxHashMap<String, Vec<usize>>,
    
    /// TestId -> record index (exact lookup)
    testid_index: FxHashMap<String, usize>,
    
    /// Synonym mappings for multilingual support
    synonyms: FxHashMap<String, Vec<String>>,
}

impl UiDatabase {
    pub fn new() -> Self {
        let mut db = UiDatabase {
            records: Vec::new(),
            role_index: FxHashMap::default(),
            token_index: FxHashMap::default(),
            testid_index: FxHashMap::default(),
            synonyms: FxHashMap::default(),
        };
        db.init_synonyms();
        db
    }

    /// Initialize common UI synonyms for multilingual matching
    fn init_synonyms(&mut self) {
        let synonym_groups = vec![
            vec!["login", "sign in", "anmelden", "einloggen", "log in"],
            vec!["logout", "sign out", "abmelden", "log out"],
            vec!["submit", "send", "absenden", "senden", "ok", "confirm"],
            vec!["cancel", "abbrechen", "close", "schließen"],
            vec!["save", "speichern", "apply"],
            vec!["delete", "remove", "löschen", "entfernen"],
            vec!["edit", "bearbeiten", "modify", "ändern"],
            vec!["search", "suchen", "find", "finden"],
            vec!["next", "weiter", "continue", "fortfahren"],
            vec!["back", "zurück", "previous"],
            vec!["home", "startseite", "main"],
            vec!["settings", "einstellungen", "preferences", "options"],
            vec!["help", "hilfe", "support"],
            vec!["profile", "profil", "account", "konto"],
            vec!["password", "passwort", "kennwort"],
            vec!["email", "e-mail", "mail"],
            vec!["username", "benutzername", "user"],
        ];

        for group in synonym_groups {
            for word in &group {
                let others: Vec<String> = group.iter()
                    .filter(|w| *w != word)
                    .map(|w| w.to_string())
                    .collect();
                self.synonyms.insert(word.to_string(), others);
            }
        }
    }

    /// Ingest records and build all indices
    pub fn ingest(&mut self, records: Vec<NodeRecord>) {
        self.reset();
        self.records = records;
        
        for (idx, record) in self.records.iter().enumerate() {
            // Role index
            self.role_index
                .entry(record.role)
                .or_default()
                .push(idx);
            
            // Token index (name + context)
            let mut tokens: Vec<String> = tokenize(&record.name);
            for ctx in &record.context {
                tokens.extend(tokenize(ctx));
            }
            
            for token in tokens {
                let list = self.token_index.entry(token).or_default();
                if !list.contains(&idx) {
                    list.push(idx);
                }
            }
            
            // TestId index
            if let Some(testid) = record.attrs.get("data-testid") {
                self.testid_index.insert(testid.clone(), idx);
            }
        }
    }

    /// Clear all data
    pub fn reset(&mut self) {
        self.records.clear();
        self.role_index.clear();
        self.token_index.clear();
        self.testid_index.clear();
    }

    /// Get number of records
    pub fn size(&self) -> usize {
        self.records.len()
    }

    /// Get record by ID
    pub fn get_record(&self, id: u32) -> Option<&NodeRecord> {
        self.records.iter().find(|r| r.id == id)
    }

    /// Execute a query and return ranked matches
    pub fn query(&self, query_json: &str) -> Result<QueryResult, String> {
        let query: QueryAST = serde_json::from_str(query_json)
            .map_err(|e| format!("Failed to parse query: {}", e))?;
        
        QueryExecutor::new(self, &self.synonyms).execute(&query)
    }

    /// Get all records reference
    pub fn records(&self) -> &[NodeRecord] {
        &self.records
    }

    /// Get role index reference
    pub fn role_index(&self) -> &FxHashMap<ElementRole, Vec<usize>> {
        &self.role_index
    }

    /// Get token index reference  
    pub fn token_index(&self) -> &FxHashMap<String, Vec<usize>> {
        &self.token_index
    }

    /// Get testid index reference
    pub fn testid_index(&self) -> &FxHashMap<String, usize> {
        &self.testid_index
    }
}

impl Default for UiDatabase {
    fn default() -> Self {
        Self::new()
    }
}
