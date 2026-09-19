# -*- coding: utf-8 -*-
"""
High-Performance, Custom BM25 Sparse Vector Generator & Qdrant Hybrid Migrator.
Extracts lexical description text from local JSON index database, builds custom BM25 index,
computes word weights, and migrates existing dense vectors from Qdrant into a dual-vector schema
enabling state-of-the-art sparse-dense hybrid retrieval using Reciprocal Rank Fusion (RRF).
"""

import os
import sys
import re
import json
import math
import urllib.request
import urllib.error

STOP_WORDS = {"and", "the", "with", "for", "due", "unspecified", "other", "not", "specified", "without", "associated", "secondary"}

def load_dotenv():
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    dotenv_path = os.path.join(base_dir, '.env')
    if os.path.exists(dotenv_path):
        with open(dotenv_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, val = line.split('=', 1)
                    os.environ[key.strip()] = val.strip()

def tokenize(text):
    if not text:
        return []
    clean = re.sub(r'[^a-zA-Z0-9\s]', ' ', str(text).lower())
    return [w for w in clean.split() if len(w) > 1 and w not in STOP_WORDS]

def build_bm25_model():
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    index_path = os.path.join(base_dir, 'src', 'data', 'icd10_index.json')
    vocab_save_path = os.path.join(base_dir, 'src', 'data', 'sparse_vocab.json')
    
    print("[1/5] Loading local clinical JSON index...")
    with open(index_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    print(f"      Loaded {len(data)} codes. Building term vocabulary and statistics...")
    
    # 1. First pass: compute word frequencies across the corpus
    df = {}
    doc_lengths = {}
    total_len = 0
    doc_tokenized = {}
    
    for code, rec in data.items():
        name = rec.get('name', '')
        synonyms = rec.get('synonyms', [])
        idx_paths = rec.get('index_paths', [])
        
        # Combine all lexical details
        text = f"{name} {' '.join(synonyms)} {' '.join(idx_paths)}"
        tokens = tokenize(text)
        
        doc_tokenized[code] = tokens
        doc_lengths[code] = len(tokens)
        total_len += len(tokens)
        
        unique_tokens = set(tokens)
        for t in unique_tokens:
            df[t] = df.get(t, 0) + 1
            
    num_docs = len(data)
    avg_doc_len = total_len / num_docs if num_docs > 0 else 1.0
    
    # 2. Filter out extremely rare words (appearing only 1 time in 47,025 docs) to prevent dictionary bloat
    # but preserve clinical words by mapping them cleanly.
    filtered_df = {k: v for k, v in df.items() if v > 1}
    
    # Map words to sequential unique indices
    vocab_map = {}
    word_idx = 0
    for word in sorted(filtered_df.keys()):
        vocab_map[word] = {
            "index": word_idx,
            "df": filtered_df[word]
        }
        word_idx += 1
        
    print(f"      Filtered vocabulary size: {len(vocab_map)} unique terms.")
    
    # 3. Calculate IDF for each term: standard BM25 IDF formulation
    for word, rec in vocab_map.items():
        doc_f = rec["df"]
        # Standard BM25 IDF formula
        idf = math.log(1.0 + (num_docs - doc_f + 0.5) / (doc_f + 0.5))
        rec["idf"] = idf
        
    # Save the computed vocabulary
    with open(vocab_save_path, 'w', encoding='utf-8') as f:
        json.dump({
            "avg_doc_len": avg_doc_len,
            "vocab": {w: {"index": v["index"], "idf": v["idf"]} for w, v in vocab_map.items()}
        }, f, indent=2)
        
    print(f"      [SUCCESS] Saved BM25 model variables to sparse_vocab.json.")
    return data, vocab_map, avg_doc_len, doc_tokenized

def compute_sparse_vector(tokens, vocab_map, avg_doc_len):
    # BM25 parameters
    k1 = 1.2
    b = 0.75
    doc_len = len(tokens)
    
    # Compute TF
    tf = {}
    for t in tokens:
        if t in vocab_map:
            tf[t] = tf.get(t, 0) + 1
            
    indices = []
    values = []
    
    for word, count in tf.items():
        v_info = vocab_map[word]
        term_idx = v_info["index"]
        idf = v_info["idf"]
        
        # Standard BM25 term weighting formula
        tf_weight = (count * (k1 + 1)) / (count + k1 * (1.0 - b + b * (doc_len / avg_doc_len)))
        score = idf * tf_weight
        
        indices.append(term_idx)
        values.append(round(score, 5))
        
    # Sort by indices (Qdrant expects sorted indices for efficient sparse vector operations)
    sorted_pairs = sorted(zip(indices, values))
    if not sorted_pairs:
        return {"indices": [], "values": []}
        
    ind, val = zip(*sorted_pairs)
    return {
        "indices": list(ind),
        "values": list(val)
    }

def create_qdrant_collection(qdrant_url, headers, collection_name):
    # Create dual-vector hybrid search collection
    url = f"{qdrant_url}/collections/{collection_name}"
    payload = {
        "vectors": {
            "text-dense": {
                "size": 1024,
                "distance": "Cosine"
            }
        },
        "sparse_vectors": {
            "text-sparse": {
                "index": {
                    "on_disk": True
                }
            }
        }
    }
    
    print(f"[3/5] Setting up Qdrant Hybrid Collection: '{collection_name}'...")
    
    # Delete if exists (just in case)
    req_delete = urllib.request.Request(url, headers=headers, method='DELETE')
    try:
        urllib.request.urlopen(req_delete, timeout=10)
        print("      Removed pre-existing collection of same name.")
    except Exception:
        pass
        
    # Create fresh collection
    req_create = urllib.request.Request(url, data=json.dumps(payload).encode(), headers=headers, method='PUT')
    try:
        with urllib.request.urlopen(req_create, timeout=10) as res:
            print(f"      Collection '{collection_name}' created successfully: {res.read().decode()}")
    except Exception as e:
        print(f"      [FATAL] Failed to create collection: {e}")
        sys.exit(1)

def migrate_points(qdrant_url, headers, source_col, target_col, clinical_data, vocab_map, avg_doc_len):
    print(f"[4/5] Migrating and compiling 47,025 codes from '{source_col}' to '{target_col}'...")
    
    # 1. Scroll through source collection to download dense vectors
    scroll_url = f"{qdrant_url}/collections/{source_col}/points/scroll"
    upload_url = f"{qdrant_url}/collections/{target_col}/points"
    
    next_page_offset = None
    processed_count = 0
    batch_size = 150
    
    while True:
        payload_scroll = {
            "limit": batch_size,
            "with_vector": True,
            "with_payload": True
        }
        if next_page_offset:
            payload_scroll["offset"] = next_page_offset
            
        import time
        t0 = time.time()
        req_scroll = urllib.request.Request(scroll_url, data=json.dumps(payload_scroll).encode(), headers=headers, method='POST')
        try:
            with urllib.request.urlopen(req_scroll) as res:
                scroll_res = json.loads(res.read().decode())['result']
                points = scroll_res['points']
                next_page_offset = scroll_res.get('next_page_offset')
                t1 = time.time()
                
                if not points:
                    break
                    
                # 2. Translate points into dual-vector formats
                hybrid_points = []
                for pt in points:
                    pt_id = pt['id']
                    dense_vector = pt['vector']
                    payload = pt['payload']
                    code = payload.get('code')
                    
                    # Compute sparse BM25 vector
                    rec = clinical_data.get(code, {})
                    name = rec.get('name', '')
                    synonyms = rec.get('synonyms', [])
                    idx_paths = rec.get('index_paths', [])
                    
                    tokens = tokenize(f"{name} {' '.join(synonyms)} {' '.join(idx_paths)}")
                    sparse_vector = compute_sparse_vector(tokens, vocab_map, avg_doc_len)
                    
                    hybrid_point = {
                        "id": pt_id,
                        "vectors": {
                            "text-dense": dense_vector,
                            "text-sparse": sparse_vector
                        },
                        "payload": payload
                    }
                    hybrid_points.append(hybrid_point)
                t2 = time.time()
                    
                # 3. Batch upload formatted dual-vectors
                payload_upload = {
                    "points": hybrid_points
                }
                req_upload = urllib.request.Request(upload_url, data=json.dumps(payload_upload).encode(), headers=headers, method='PUT')
                with urllib.request.urlopen(req_upload) as upload_res:
                    upload_res.read()
                t3 = time.time()
                    
                processed_count += len(points)
                print(f"      Migrated {processed_count} points. Scroll: {t1-t0:.2f}s, BM25: {t2-t1:.2f}s, Upload: {t3-t2:.2f}s")
                
                if not next_page_offset:
                    break
        except Exception as e:
            print(f"      [ERROR] Migration batch failed: {e}")
            sys.exit(1)
            
    print(f"      [SUCCESS] Migration fully completed. {processed_count} points written.")

def verify_and_swap(qdrant_url, headers, source_col, target_col):
    print("[5/5] Verification and collection hot-swap...")
    
    # Check point count in hybrid collection
    url_info = f"{qdrant_url}/collections/{target_col}"
    req_info = urllib.request.Request(url_info, headers=headers)
    try:
        with urllib.request.urlopen(req_info) as res:
            info = json.loads(res.read().decode())['result']
            pts = info['points_count']
            status = info['status']
            print(f"      Target collection info: status='{status}', points_count={pts}")
            
            if pts < 47000:
                print("      [FATAL] Migration verify failed: point count is insufficient.")
                sys.exit(1)
                
            # Perform hot-swap: Delete old source collection and recreate it with hybrid layout
            print("      Verification succeeded. Swapping collection schemas...")
            
            url_source = f"{qdrant_url}/collections/{source_col}"
            
            # 1. Delete oldUnnamed collection
            req_del = urllib.request.Request(url_source, headers=headers, method='DELETE')
            urllib.request.urlopen(req_del)
            print("      Old unnamed 'icd10_codes' collection deleted.")
            
            # 2. Create fresh 'icd10_codes' with dual-vector layout
            create_qdrant_collection(qdrant_url, headers, source_col)
            
            # 3. Migrate from temporary target_col back to fresh 'icd10_codes'
            print(f"      Restoring dual-vectors back into official collection '{source_col}'...")
            scroll_target_url = f"{qdrant_url}/collections/{target_col}/points/scroll"
            upload_source_url = f"{qdrant_url}/collections/{source_col}/points"
            
            next_page_offset = None
            restored_count = 0
            
            while True:
                payload_scroll = {
                    "limit": 150,
                    "with_vector": True,
                    "with_payload": True
                }
                if next_page_offset:
                    payload_scroll["offset"] = next_page_offset
                    
                req_scroll = urllib.request.Request(scroll_target_url, data=json.dumps(payload_scroll).encode(), headers=headers, method='POST')
                with urllib.request.urlopen(req_scroll) as scroll_res:
                    res_data = json.loads(scroll_res.read().decode())['result']
                    points = res_data['points']
                    next_page_offset = res_data.get('next_page_offset')
                    
                    if not points:
                        break
                        
                    formatted_points = []
                    for pt in points:
                        formatted_points.append({
                            "id": pt["id"],
                            "vectors": pt["vectors"], # Already structured in named dual-vector format
                            "payload": pt["payload"]
                        })
                        
                    payload_upload = {"points": formatted_points}
                    req_upload = urllib.request.Request(upload_source_url, data=json.dumps(payload_upload).encode(), headers=headers, method='PUT')
                    with urllib.request.urlopen(req_upload) as up_res:
                        up_res.read()
                        
                    restored_count += len(points)
                    
                    if not next_page_offset:
                        break
                        
            print(f"      Restored {restored_count} dual-vectors to '{source_col}'.")
            
            # 4. Cleanup temporary target collection
            req_cleanup = urllib.request.Request(url_info, headers=headers, method='DELETE')
            urllib.request.urlopen(req_cleanup)
            print(f"      Temporary target collection '{target_col}' cleaned up.")
            print("      [COMPLETE] Swap finished. Collection 'icd10_codes' is now a Dual-Vector Hybrid Index!")
    except Exception as e:
        print(f"      [FATAL] Swapping failed: {e}")
        sys.exit(1)

def main():
    load_dotenv()
    qdrant_url = os.getenv('QDRANT_URL', 'http://localhost:6333')
    qdrant_api_key = os.getenv('QDRANT_API_KEY', '')
    
    headers = {'Content-Type': 'application/json'}
    if qdrant_api_key:
        headers['api-key'] = qdrant_api_key
        
    print("="*85)
    print("MIGRATING TO DUAL-VECTOR HYBRID SCHEMA (SPARSE BM25 + DENSE COWSINE)")
    print("="*85)
    
    # Phase 1 & 2: Build BM25 statistics and sparse vocabulary
    clinical_data, vocab_map, avg_doc_len, doc_tokenized = build_bm25_model()
    
    # Phase 3: Create temporary hybrid collection layout
    temp_collection = "icd10_codes_hybrid"
    create_qdrant_collection(qdrant_url, headers, temp_collection)
    
    # Phase 4: Scroll and copy old points into dual vector layouts
    migrate_points(qdrant_url, headers, "icd10_codes", temp_collection, clinical_data, vocab_map, avg_doc_len)
    
    # Phase 5: Verification, Delete Unnamed layout, and Reconstruct on 'icd10_codes'
    verify_and_swap(qdrant_url, headers, "icd10_codes", temp_collection)
    
    print("="*85)
    print("🎉 HYBRID RETRIEVAL SEEDING SUCCESSFUL! SYSTEM READY FOR RRF FUSION SEARCHES!")
    print("="*85)

if __name__ == '__main__':
    main()