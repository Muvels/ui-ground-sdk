//! Cosine similarity and vector operations for embeddings

/// Compute cosine similarity between two normalized embeddings
/// Returns a value between -1.0 and 1.0 (1.0 = identical)
pub fn cosine_similarity(a: &[f32], b: &[f32]) -> f32 {
    if a.len() != b.len() || a.is_empty() {
        return 0.0;
    }

    // For already-normalized vectors, cosine similarity is just dot product
    let mut dot = 0.0_f32;
    for i in 0..a.len() {
        dot += a[i] * b[i];
    }

    dot
}

/// Compute cosine similarity between unnormalized vectors
pub fn cosine_similarity_unnormalized(a: &[f32], b: &[f32]) -> f32 {
    if a.len() != b.len() || a.is_empty() {
        return 0.0;
    }

    let mut dot = 0.0_f32;
    let mut norm_a = 0.0_f32;
    let mut norm_b = 0.0_f32;

    for i in 0..a.len() {
        dot += a[i] * b[i];
        norm_a += a[i] * a[i];
        norm_b += b[i] * b[i];
    }

    let denominator = (norm_a * norm_b).sqrt();
    if denominator > 0.0 {
        dot / denominator
    } else {
        0.0
    }
}

/// Compute cosine similarity for a query against multiple candidates
/// Returns vector of (index, similarity) pairs, sorted by similarity descending
pub fn batch_cosine_similarity(
    query: &[f32],
    candidates: &[(usize, Vec<f32>)],
) -> Vec<(usize, f32)> {
    let mut results: Vec<(usize, f32)> = candidates
        .iter()
        .map(|(idx, emb)| (*idx, cosine_similarity(query, emb)))
        .collect();

    // Sort by similarity descending
    results.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));

    results
}

/// Get top-k most similar candidates
pub fn top_k_similar(
    query: &[f32],
    candidates: &[(usize, Vec<f32>)],
    k: usize,
) -> Vec<(usize, f32)> {
    let mut results = batch_cosine_similarity(query, candidates);
    results.truncate(k);
    results
}

/// Normalize an embedding vector in-place (L2 normalization)
pub fn normalize_embedding(embedding: &mut [f32]) {
    let mut sum = 0.0_f32;
    for val in embedding.iter() {
        sum += val * val;
    }
    let norm = sum.sqrt();
    if norm > 0.0 {
        for val in embedding.iter_mut() {
            *val /= norm;
        }
    }
}

/// Check if an embedding is normalized (L2 norm ≈ 1.0)
pub fn is_normalized(embedding: &[f32]) -> bool {
    let mut sum = 0.0_f32;
    for val in embedding.iter() {
        sum += val * val;
    }
    (sum.sqrt() - 1.0).abs() < 0.001
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cosine_similarity_identical() {
        let a = vec![0.6, 0.8]; // Already normalized (0.6² + 0.8² = 1)
        let b = vec![0.6, 0.8];
        let sim = cosine_similarity(&a, &b);
        assert!((sim - 1.0).abs() < 0.001);
    }

    #[test]
    fn test_cosine_similarity_orthogonal() {
        let a = vec![1.0, 0.0];
        let b = vec![0.0, 1.0];
        let sim = cosine_similarity(&a, &b);
        assert!(sim.abs() < 0.001);
    }

    #[test]
    fn test_cosine_similarity_opposite() {
        let a = vec![0.6, 0.8];
        let b = vec![-0.6, -0.8];
        let sim = cosine_similarity(&a, &b);
        assert!((sim + 1.0).abs() < 0.001);
    }

    #[test]
    fn test_normalize_embedding() {
        let mut emb = vec![3.0, 4.0]; // Norm = 5
        normalize_embedding(&mut emb);
        assert!((emb[0] - 0.6).abs() < 0.001);
        assert!((emb[1] - 0.8).abs() < 0.001);
        assert!(is_normalized(&emb));
    }

    #[test]
    fn test_batch_similarity() {
        let query = vec![0.6, 0.8];
        let candidates = vec![
            (0, vec![0.6, 0.8]),   // Identical, sim = 1.0
            (1, vec![0.8, 0.6]),   // Close, sim ≈ 0.96
            (2, vec![-0.6, -0.8]), // Opposite, sim = -1.0
        ];

        let results = batch_cosine_similarity(&query, &candidates);
        assert_eq!(results[0].0, 0); // Identical first
        assert_eq!(results[2].0, 2); // Opposite last
    }

    #[test]
    fn test_top_k() {
        let query = vec![0.6, 0.8];
        let candidates = vec![
            (0, vec![0.6, 0.8]),
            (1, vec![0.8, 0.6]),
            (2, vec![-0.6, -0.8]),
        ];

        let top2 = top_k_similar(&query, &candidates, 2);
        assert_eq!(top2.len(), 2);
        assert_eq!(top2[0].0, 0);
        assert_eq!(top2[1].0, 1);
    }
}
