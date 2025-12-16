//! LRU cache for fingerprint → embedding mapping

use std::collections::{HashMap, VecDeque};

/// Entry in the embedding cache
#[derive(Clone)]
pub struct CacheEntry {
    pub embedding: Vec<f32>,
    pub access_count: u32,
}

/// LRU cache for embeddings indexed by fingerprint
pub struct EmbeddingCache {
    entries: HashMap<String, CacheEntry>,
    access_order: VecDeque<String>,
    capacity: usize,
}

impl EmbeddingCache {
    /// Create a new cache with the specified capacity
    pub fn new(capacity: usize) -> Self {
        EmbeddingCache {
            entries: HashMap::with_capacity(capacity),
            access_order: VecDeque::with_capacity(capacity),
            capacity,
        }
    }

    /// Get an embedding by fingerprint (updates access order)
    pub fn get(&mut self, fingerprint: &str) -> Option<&[f32]> {
        if self.entries.contains_key(fingerprint) {
            // Update access order
            self.access_order.retain(|k| k != fingerprint);
            self.access_order.push_back(fingerprint.to_string());
            
            // Update access count
            if let Some(entry) = self.entries.get_mut(fingerprint) {
                entry.access_count += 1;
                return Some(&entry.embedding);
            }
        }
        None
    }

    /// Get an embedding without updating access order (for read-only operations)
    pub fn peek(&self, fingerprint: &str) -> Option<&[f32]> {
        self.entries.get(fingerprint).map(|e| e.embedding.as_slice())
    }

    /// Store an embedding for a fingerprint
    pub fn put(&mut self, fingerprint: String, embedding: Vec<f32>) {
        // If already exists, just update
        if self.entries.contains_key(&fingerprint) {
            if let Some(entry) = self.entries.get_mut(&fingerprint) {
                entry.embedding = embedding;
            }
            // Update access order
            self.access_order.retain(|k| k != &fingerprint);
            self.access_order.push_back(fingerprint);
            return;
        }

        // Evict if at capacity
        while self.entries.len() >= self.capacity {
            if let Some(oldest) = self.access_order.pop_front() {
                self.entries.remove(&oldest);
            }
        }

        // Insert new entry
        self.entries.insert(fingerprint.clone(), CacheEntry {
            embedding,
            access_count: 1,
        });
        self.access_order.push_back(fingerprint);
    }

    /// Get fingerprints that are not in the cache
    pub fn get_missing(&self, fingerprints: &[String]) -> Vec<String> {
        fingerprints
            .iter()
            .filter(|fp| !self.entries.contains_key(*fp))
            .cloned()
            .collect()
    }

    /// Get cached fingerprints with their embeddings
    pub fn get_cached(&self, fingerprints: &[String]) -> Vec<(String, Vec<f32>)> {
        fingerprints
            .iter()
            .filter_map(|fp| {
                self.entries.get(fp).map(|e| (fp.clone(), e.embedding.clone()))
            })
            .collect()
    }

    /// Get the current size of the cache
    pub fn size(&self) -> usize {
        self.entries.len()
    }

    /// Clear the cache
    pub fn clear(&mut self) {
        self.entries.clear();
        self.access_order.clear();
    }

    /// Get capacity
    pub fn capacity(&self) -> usize {
        self.capacity
    }
}

impl Default for EmbeddingCache {
    fn default() -> Self {
        Self::new(10000) // Default: cache up to 10k embeddings
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cache_put_get() {
        let mut cache = EmbeddingCache::new(3);
        
        cache.put("a".to_string(), vec![1.0, 2.0, 3.0]);
        cache.put("b".to_string(), vec![4.0, 5.0, 6.0]);
        
        assert_eq!(cache.get("a"), Some([1.0, 2.0, 3.0].as_slice()));
        assert_eq!(cache.get("b"), Some([4.0, 5.0, 6.0].as_slice()));
        assert_eq!(cache.get("c"), None);
    }

    #[test]
    fn test_cache_eviction() {
        let mut cache = EmbeddingCache::new(2);
        
        cache.put("a".to_string(), vec![1.0]);
        cache.put("b".to_string(), vec![2.0]);
        cache.put("c".to_string(), vec![3.0]); // Should evict "a"
        
        assert_eq!(cache.get("a"), None);
        assert_eq!(cache.get("b"), Some([2.0].as_slice()));
        assert_eq!(cache.get("c"), Some([3.0].as_slice()));
    }

    #[test]
    fn test_cache_lru_order() {
        let mut cache = EmbeddingCache::new(2);
        
        cache.put("a".to_string(), vec![1.0]);
        cache.put("b".to_string(), vec![2.0]);
        cache.get("a"); // Access "a", making "b" the oldest
        cache.put("c".to_string(), vec![3.0]); // Should evict "b"
        
        assert_eq!(cache.get("a"), Some([1.0].as_slice()));
        assert_eq!(cache.get("b"), None);
        assert_eq!(cache.get("c"), Some([3.0].as_slice()));
    }

    #[test]
    fn test_get_missing() {
        let mut cache = EmbeddingCache::new(10);
        
        cache.put("a".to_string(), vec![1.0]);
        cache.put("b".to_string(), vec![2.0]);
        
        let fingerprints = vec!["a".to_string(), "b".to_string(), "c".to_string(), "d".to_string()];
        let missing = cache.get_missing(&fingerprints);
        
        assert_eq!(missing, vec!["c".to_string(), "d".to_string()]);
    }
}
