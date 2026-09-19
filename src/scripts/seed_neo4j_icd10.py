# -*- coding: utf-8 -*-
"""
High-Performance, Clinical-Grade Neo4j Ontology Seeder for ICD-10-CM
Optimized for network/VPN latency via single-pass Cypher batching.
"""

import os
import sys
import json
import time
from neo4j import GraphDatabase

NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "")

INDEX_FILE_PATH = os.path.join(os.getcwd(), "src", "data", "icd10_index.json")

def create_constraints(session):
    print("[NEO4J SEEDER] Setting up database uniqueness constraints and indexes...")
    constraints = [
        "CREATE CONSTRAINT code_id_unique IF NOT EXISTS FOR (c:Code) REQUIRE c.id IS UNIQUE",
        "CREATE CONSTRAINT chapter_id_unique IF NOT EXISTS FOR (ch:Chapter) REQUIRE ch.id IS UNIQUE",
        "CREATE CONSTRAINT block_id_unique IF NOT EXISTS FOR (b:Block) REQUIRE b.id IS UNIQUE",
        "CREATE CONSTRAINT anatomy_name_unique IF NOT EXISTS FOR (a:Anatomy) REQUIRE a.name IS UNIQUE",
        "CREATE CONSTRAINT symptom_name_unique IF NOT EXISTS FOR (s:Symptom) REQUIRE s.name IS UNIQUE",
        "CREATE CONSTRAINT organism_name_unique IF NOT EXISTS FOR (o:Organism) REQUIRE o.name IS UNIQUE"
    ]
    for statement in constraints:
        try:
            session.run(statement)
        except Exception as e:
            print(f"[NEO4J SEEDER] Warning while creating constraint: {e}")

def seed_batches(session, index_data, batch_size=500):
    all_codes = list(index_data.keys())
    total_records = len(all_codes)
    print(f"[NEO4J SEEDER] Found {total_records} records to seed. Processing in batches of {batch_size}...")

    # Single-pass unified Cypher batch query to eliminate round-trip network latency
    cypher_unified_batch = """
    UNWIND $batch AS row
    MERGE (c:Code {id: row.code})
    SET c.name = row.name,
        c.body_system = row.body_system,
        c.disease_type = row.disease_type,
        c.synonyms = row.synonyms,
        c.index_paths = row.index_paths

    FOREACH (_ IN CASE WHEN row.chapter IS NOT NULL THEN [1] ELSE [] END |
      MERGE (ch:Chapter {id: row.chapter})
      MERGE (c)-[:IN_CHAPTER]->(ch)
    )

    FOREACH (_ IN CASE WHEN row.block IS NOT NULL THEN [1] ELSE [] END |
      MERGE (b:Block {id: row.block})
      MERGE (c)-[:IN_BLOCK]->(b)
    )

    FOREACH (_ IN CASE WHEN row.parent_code IS NOT NULL THEN [1] ELSE [] END |
      MERGE (p:Code {id: row.parent_code})
      MERGE (c)-[:CHILD_OF]->(p)
    )

    FOREACH (loc IN row.body_locations |
      MERGE (a:Anatomy {name: loc})
      MERGE (c)-[:AFFECTS_ANATOMY]->(a)
    )

    FOREACH (sym IN row.symptoms |
      MERGE (s:Symptom {name: sym})
      MERGE (c)-[:HAS_SYMPTOM]->(s)
    )

    FOREACH (org IN row.organisms |
      MERGE (o:Organism {name: org})
      MERGE (c)-[:CAUSED_BY_ORGANISM]->(o)
    )

    FOREACH (ex IN row.excludes |
      MERGE (e:Code {id: ex})
      MERGE (c)-[:EXCLUDES1]->(e)
    )
    """

    start_time = time.time()
    for i in range(0, total_records, batch_size):
        batch_keys = all_codes[i:i + batch_size]
        batch_payloads = []
        
        for k in batch_keys:
            rec = index_data[k]
            batch_payloads.append({
                "code": rec.get("code"),
                "name": rec.get("name"),
                "chapter": rec.get("chapter"),
                "block": rec.get("block"),
                "parent_code": rec.get("parent_code"),
                "body_system": rec.get("body_system", ""),
                "disease_type": rec.get("disease_type", ""),
                "body_locations": rec.get("body_locations", []),
                "symptoms": rec.get("symptoms", []),
                "organisms": rec.get("organisms", []),
                "excludes": rec.get("excludes", []),
                "synonyms": rec.get("synonyms", []),
                "index_paths": rec.get("index_paths", [])
            })

        try:
            session.run(cypher_unified_batch, batch=batch_payloads)
        except Exception as tx_err:
            print(f"\n[NEO4J SEEDER] Error committing batch {i} to {i + len(batch_keys)}: {tx_err}")
            raise tx_err

        elapsed = time.time() - start_time
        processed = min(i + batch_size, total_records)
        rate = processed / elapsed if elapsed > 0 else 0
        remaining_time = (total_records - processed) / rate if rate > 0 else 0
        print(f"[NEO4J SEEDER] Seeded {processed}/{total_records} ({processed/total_records*100:.1f}%) | "
              f"Rate: {rate:.1f} codes/sec | Elapsed: {elapsed:.1f}s | Est. Remaining: {remaining_time:.1f}s")
        sys.stdout.flush()

    print(f"\n[NEO4J SEEDER] Completed seeding {total_records} points in {time.time() - start_time:.1f} seconds!")

def main():
    print("[NEO4J SEEDER] Starting Neo4j Clinical Ontology Seeder...")
    
    if not os.path.exists(INDEX_FILE_PATH):
        print(f"[NEO4J SEEDER] Error: Index file not found at {INDEX_FILE_PATH}")
        sys.exit(1)

    print(f"[NEO4J SEEDER] Loading local index JSON...")
    try:
        with open(INDEX_FILE_PATH, "r", encoding="utf-8") as f:
            index_data = json.load(f)
    except Exception as e:
        print(f"[NEO4J SEEDER] Error loading JSON: {e}")
        sys.exit(1)

    print(f"[NEO4J SEEDER] Connecting to Neo4j database...")
    try:
        driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
        driver.verify_connectivity()
        print("[NEO4J SEEDER] Connected successfully!")
    except Exception as conn_err:
        print(f"[NEO4J SEEDER] Connection error: {conn_err}")
        sys.exit(1)

    try:
        with driver.session() as session:
            create_constraints(session)
            time.sleep(2)
            seed_batches(session, index_data, batch_size=500)
    finally:
        driver.close()
        print("[NEO4J SEEDER] Driver closed.")

if __name__ == "__main__":
    main()
