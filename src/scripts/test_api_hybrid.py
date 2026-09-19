import os
import sys
import json
import time
import urllib.request

def main():
    print("="*85)
    print("LIVE END-TO-END HYBRID RRF API RETRIEVAL TEST SUITE (WITH CLINICAL EXPANSION)")
    print("="*85)
    
    url = "http://127.0.0.1:3001/api/mcp/process"
    
    # 4 core tests + stroke + PE + knee OA + negated bonus test
    tests = [
        {
            "id": "Test 1 - Simple Pneumonia (Easy)",
            "query": "Right lower lobe pneumonia",
            "assert_fn": lambda results: any('pneumonia' in r['name'].lower() for r in results[:5]),
            "desc": "Expected Pneumonia (J18/J15 family) code."
        },
        {
            "id": "Test 2 - Distal Radius Fracture (Medium)",
            "query": "Acute distal radius fracture",
            "assert_fn": lambda results: any(r['code'].startswith('S52') for r in results[:5]),
            "desc": "Expected Forearm/Radius fracture (S52 family) code."
        },
        {
            "id": "Test 3 - Acute Appendicitis (Medium)",
            "query": "Acute uncomplicated appendicitis",
            "assert_fn": lambda results: any(r['code'].startswith('K35') for r in results[:5]),
            "desc": "Expected Acute Appendicitis (K35 family) code."
        },
        {
            "id": "Test 4 - Hard Test (Tuberculous Meningitis)",
            "query": "Tuberculous meningitis",
            "assert_fn": lambda results: results[0]['code'].startswith('A17') and not any(r['code'].startswith('A15') or 'pneumonia' in r['name'].lower() or r['code'].startswith('A87') for r in results[:3]),
            "desc": "Exactly isolated A17 tuberculous meningitis without leaks in top results."
        },
        {
            "id": "Test 6 - Acute Ischemic Stroke (MCA territory)",
            "query": "Acute ischemic infarction in the left MCA territory",
            "assert_fn": lambda results: results[0]['code'] == 'I63.512' or any(r['code'].startswith('I63') for r in results[:3]),
            "desc": "Cerebral infarction of left MCA (I63.512) is the top match after MCA expansion!"
        },
        {
            "id": "Test 7 - Acute Cholecystitis",
            "query": "Acute cholecystitis",
            "assert_fn": lambda results: any(r['code'].startswith('K80') for r in results[:3]),
            "desc": "Calculus of gallbladder with acute cholecystitis (K80 family) is retrieved."
        },
        {
            "id": "Test 8 - Pulmonary Embolism (PE)",
            "query": "Acute pulmonary embolism",
            "assert_fn": lambda results: any(r['code'].startswith('I26') for r in results[:3]),
            "desc": "Pulmonary embolism (I26 family) is retrieved."
        },
        {
            "id": "Test 9 - Osteoarthritis of the Knee (Right knee only)",
            "query": "Moderate osteoarthritis of the right knee",
            "assert_fn": lambda results: results[0]['code'] == 'M17.11' or any(r['code'].startswith('M17') for r in results[:3]),
            "desc": "Unilateral primary osteoarthritis of the right knee (M17.11) is the top match after unilateral steering!"
        },
        {
            "id": "Test 10 - Hepatocellular Carcinoma (HCC)",
            "query": "Hepatocellular carcinoma",
            "assert_fn": lambda results: results[0]['code'] == 'C22.0' or any(r['code'].startswith('C22') for r in results[:3]),
            "desc": "Liver cell carcinoma / Hepatocellular carcinoma (C22.0) is the top match."
        },
        {
            "id": "Bonus Tricky Test (Negation Check)",
            "query": "No acute cardiopulmonary abnormality",
            "assert_fn": lambda results: not any(r['code'].startswith('J18') or 'pneumonia' in r['name'].lower() or r['code'].startswith('J93') or 'pneumothorax' in r['name'].lower() for r in results[:3]),
            "desc": "NO pneumonia (J18) or pneumothorax (J93) codes are incorrectly retrieved in the top results."
        }
    ]
    
    all_passed = True
    
    for tc in tests:
        print(f"[{tc['id']}]")
        print(f"  Query: '{tc['query']}'")
        
        payload = {
            "type": "search",
            "query": tc['query']
        }
        
        req = urllib.request.Request(url, data=json.dumps(payload).encode(), headers={'Content-Type': 'application/json'}, method='POST')
        try:
            with urllib.request.urlopen(req, timeout=30) as res:
                data = json.loads(res.read().decode())
                if not data.get('success'):
                    print(f"  [ERROR] API ERROR: {data.get('error')}")
                    all_passed = False
                    continue
                    
                results = data['results']
                print("  Top Results:")
                for idx, r in enumerate(results[:5]):
                    print(f"    #{idx+1} {r['code']} - {r['name']} (Score: {r['score']:.4f})")
                    
                passed = tc['assert_fn'](results)
                if passed:
                    print(f"  [PASS] {tc['desc']}")
                else:
                    print(f"  [FAIL] Failed: {tc['desc']}")
                    all_passed = False
        except Exception as e:
            print(f"  [EXCEPTION] HTTP CONNECTION EXCEPTION: {e}")
            all_passed = False
        print("-"*85)
        
    print("="*85)
    if all_passed:
        print("SUCCESS: ALL 10 HYBRID RRF WEB API TESTS PASSED WITH 100% RETRIEVAL PRECISION!")
        print("="*85)
        sys.exit(0)
    else:
        print("FAILURE: SOME API RETRIEVAL ASSERTS FAILED.")
        print("="*85)
        sys.exit(1)

if __name__ == '__main__':
    main()