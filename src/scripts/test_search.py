import os
import sys
import json
import urllib.request

def main():
    # Resolve .env
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    dotenv_path = os.path.join(base_dir, '.env')
    if os.path.exists(dotenv_path):
        with open(dotenv_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, val = line.split('=', 1)
                    os.environ[key.strip()] = val.strip()

    qdrant_url = os.getenv('QDRANT_URL', 'http://localhost:6333')
    qdrant_api_key = os.getenv('QDRANT_API_KEY', '')
    embedding_url = os.getenv('EMBEDDING_API_URL', 'http://127.0.0.1:6969/v1/embeddings')
    model_name = os.getenv('EMBEDDING_MODEL_NAME', 'text-embedding-qwen3-embedding-4b')

    query = 'heart inflammation due to typhoid fever'
    print("="*60)
    print(f"Executing Vector Search for: '{query}'")
    print("="*60)

    # 1. Embed using LM Studio
    payload_embed = {
        'model': model_name,
        'input': query
    }
    headers_embed = {'Content-Type': 'application/json'}
    try:
        req_embed = urllib.request.Request(embedding_url, data=json.dumps(payload_embed).encode(), headers=headers_embed, method='POST')
        with urllib.request.urlopen(req_embed, timeout=20) as res:
            res_data = json.loads(res.read().decode())
            query_vector = res_data['data'][0]['embedding']
            print(f"[SUCCESS] LM Studio generated {len(query_vector)}d vector.")
    except Exception as e:
        print(f"[ERROR] Failed to connect to LM Studio: {e}")
        return

    # 2. Search Qdrant
    payload_search = {
        'vector': query_vector,
        'limit': 3,
        'with_payload': True
    }
    headers_search = {
        'Content-Type': 'application/json'
    }
    if qdrant_api_key:
        headers_search['api-key'] = qdrant_api_key

    search_url = f'{qdrant_url}/collections/icd10_codes/points/search'
    try:
        req_search = urllib.request.Request(search_url, data=json.dumps(payload_search).encode(), headers=headers_search, method='POST')
        with urllib.request.urlopen(req_search, timeout=10) as res:
            search_data = json.loads(res.read().decode())
            results = search_data['result']
            print(f"[SUCCESS] Qdrant search resolved {len(results)} matches:\n")
            for idx, match in enumerate(results):
                score = match['score']
                payload = match['payload']
                print(f"{idx+1}. Code: {payload['code']} | Score: {score:.4f}")
                print(f"   Name:     {payload['name']}")
                print(f"   Chapter:  {payload['chapter']}")
                print(f"   Block:    {payload['block']}")
                if payload.get('body_system'):
                    print(f"   System:   {payload['body_system']}")
                if payload.get('body_locations'):
                    print(f"   Locations: {payload['body_locations']}")
                if payload.get('disease_type'):
                    print(f"   Type:     {payload['disease_type']}")
                if payload.get('organisms'):
                    print(f"   Organisms: {payload['organisms']}")
                if payload.get('symptoms'):
                    print(f"   Symptoms:  {payload['symptoms']}")
                if payload.get('excludes'):
                    print(f"   Excludes:  {payload['excludes']}")
                if payload['parent_code']:
                    print(f"   Parent:   {payload['parent_code']}")
                if payload['synonyms']:
                    print(f"   Synonyms: {payload['synonyms']}")
                if payload['search_index_paths']:
                    print(f"   Index Paths: {payload['search_index_paths']}")
                print("-"*60)
    except Exception as e:
        print(f"[ERROR] Failed to query Qdrant: {e}")

if __name__ == '__main__':
    main()
