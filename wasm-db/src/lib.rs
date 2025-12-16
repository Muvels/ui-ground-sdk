//! UI-Ground WASM Query Engine
//! High-performance database and query execution for UI element navigation

mod types;
mod db;
mod query;
mod tokenizer;
mod cache;
mod similarity;

use wasm_bindgen::prelude::*;
use types::NodeRecord;
use db::UiDatabase;
use cache::EmbeddingCache;
use similarity::{cosine_similarity, top_k_similar};

// Initialize panic hook for better error messages in dev
#[wasm_bindgen(start)]
pub fn init() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}

/// Main database interface exposed to JavaScript
#[wasm_bindgen]
pub struct WasmUiDb {
    db: UiDatabase,
    embedding_cache: EmbeddingCache,
}

#[wasm_bindgen]
impl WasmUiDb {
    /// Create a new database instance
    #[wasm_bindgen(constructor)]
    pub fn new() -> WasmUiDb {
        WasmUiDb {
            db: UiDatabase::new(),
            embedding_cache: EmbeddingCache::new(10000),
        }
    }

    /// Ingest records from JavaScript
    /// Expects a JS array of NodeRecord objects
    #[wasm_bindgen]
    pub fn ingest(&mut self, records_js: JsValue) -> Result<(), JsValue> {
        let records: Vec<NodeRecord> = serde_wasm_bindgen::from_value(records_js)
            .map_err(|e| JsValue::from_str(&format!("Failed to parse records: {}", e)))?;
        
        self.db.ingest(records);
        Ok(())
    }

    /// Execute a query and return matches
    /// Expects a JSON query string, returns QueryResult as JS object
    #[wasm_bindgen]
    pub fn query(&self, query_json: &str) -> Result<JsValue, JsValue> {
        let result = self.db.query(query_json)
            .map_err(|e| JsValue::from_str(&format!("Query failed: {}", e)))?;
        
        serde_wasm_bindgen::to_value(&result)
            .map_err(|e| JsValue::from_str(&format!("Failed to serialize result: {}", e)))
    }

    /// Get the number of records in the database
    #[wasm_bindgen]
    pub fn size(&self) -> usize {
        self.db.size()
    }

    /// Clear all records
    #[wasm_bindgen]
    pub fn reset(&mut self) {
        self.db.reset();
        self.embedding_cache.clear();
    }

    /// Get a record by ID (returns JS object or undefined)
    #[wasm_bindgen]
    pub fn get_record(&self, id: u32) -> Result<JsValue, JsValue> {
        match self.db.get_record(id) {
            Some(record) => serde_wasm_bindgen::to_value(record)
                .map_err(|e| JsValue::from_str(&format!("Serialization failed: {}", e))),
            None => Ok(JsValue::UNDEFINED),
        }
    }

    // ==================== Embedding Cache Methods ====================

    /// Cache an embedding for a fingerprint
    #[wasm_bindgen]
    pub fn cache_embedding(&mut self, fingerprint: String, embedding: Vec<f32>) {
        self.embedding_cache.put(fingerprint, embedding);
    }

    /// Get a cached embedding by fingerprint (returns Float32Array or undefined)
    #[wasm_bindgen]
    pub fn get_embedding(&self, fingerprint: &str) -> Result<JsValue, JsValue> {
        match self.embedding_cache.peek(fingerprint) {
            Some(embedding) => {
                let arr = js_sys::Float32Array::from(embedding);
                Ok(arr.into())
            }
            None => Ok(JsValue::UNDEFINED),
        }
    }

    /// Get fingerprints that are not in the cache
    /// Input: JS array of strings, Output: JS array of missing fingerprints
    #[wasm_bindgen]
    pub fn get_missing_embeddings(&self, fingerprints_js: JsValue) -> Result<JsValue, JsValue> {
        let fingerprints: Vec<String> = serde_wasm_bindgen::from_value(fingerprints_js)
            .map_err(|e| JsValue::from_str(&format!("Failed to parse fingerprints: {}", e)))?;
        
        let missing = self.embedding_cache.get_missing(&fingerprints);
        
        serde_wasm_bindgen::to_value(&missing)
            .map_err(|e| JsValue::from_str(&format!("Failed to serialize missing: {}", e)))
    }

    /// Get the number of cached embeddings
    #[wasm_bindgen]
    pub fn cache_size(&self) -> usize {
        self.embedding_cache.size()
    }

    /// Clear the embedding cache
    #[wasm_bindgen]
    pub fn clear_cache(&mut self) {
        self.embedding_cache.clear();
    }

    // ==================== Semantic Search Methods ====================

    /// Perform semantic reranking of candidates based on query embedding
    /// Returns array of {id, similarity} sorted by similarity descending
    #[wasm_bindgen]
    pub fn semantic_rerank(
        &self,
        query_embedding_js: Vec<f32>,
        candidate_ids_js: Vec<u32>,
        top_k: usize,
    ) -> Result<JsValue, JsValue> {
        // Gather embeddings for candidates that have them cached
        let mut candidates_with_embeddings: Vec<(usize, Vec<f32>)> = Vec::new();
        let records = self.db.records();

        for &id in &candidate_ids_js {
            if let Some(record) = records.iter().find(|r| r.id == id) {
                if let Some(emb) = self.embedding_cache.peek(&record.fingerprint) {
                    candidates_with_embeddings.push((id as usize, emb.to_vec()));
                }
            }
        }

        // Compute similarities and get top-k
        let ranked = top_k_similar(&query_embedding_js, &candidates_with_embeddings, top_k);

        // Convert to JS-friendly format
        let result: Vec<SemanticMatch> = ranked
            .into_iter()
            .map(|(id, similarity)| SemanticMatch {
                id: id as u32,
                similarity,
            })
            .collect();

        serde_wasm_bindgen::to_value(&result)
            .map_err(|e| JsValue::from_str(&format!("Failed to serialize results: {}", e)))
    }

    /// Compute cosine similarity between two embeddings
    #[wasm_bindgen]
    pub fn compute_cosine_similarity(a: Vec<f32>, b: Vec<f32>) -> f32 {
        cosine_similarity(&a, &b)
    }
}

/// Semantic match result for JS
#[derive(serde::Serialize)]
struct SemanticMatch {
    id: u32,
    similarity: f32,
}

impl Default for WasmUiDb {
    fn default() -> Self {
        Self::new()
    }
}

