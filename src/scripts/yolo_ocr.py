import sys
import json
import os
import time

# Suppress standard YOLO logging before importing ultralytics
os.environ["YOLO_VERBOSE"] = "False"

try:
    from ultralytics import YOLOE
except ImportError:
    print(json.dumps({"success": False, "error": "The 'ultralytics' library on this machine does not support the new YOLOE open-vocabulary class."}))
    sys.exit(1)

import torch
torch.set_num_threads(1)

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "No image file path provided to python script."}))
        return

    image_path = sys.argv[1]
    if not os.path.exists(image_path):
        print(json.dumps({"success": False, "error": f"Image file not found: {image_path}"}))
        return

    # Extract target class filter from command line arguments
    target_class = sys.argv[2].lower().strip() if len(sys.argv) > 2 else ""

    try:
        diagnostics = []
        
        # Resolve the model file location in src/assets/ relative to this script
        script_dir = os.path.dirname(os.path.abspath(__file__))
        model_path = os.path.join(script_dir, "..", "assets", "yoloe-11s-seg.pt")
        model_path = os.path.abspath(model_path)

        if not os.path.exists(model_path):
            print(json.dumps({"success": False, "error": f"YOLOE model file 'yoloe-11s-seg.pt' not found at expected path: {model_path}"}))
            return

        # 1. Measure Model Load Time
        load_start = time.time()
        # Initialize the true YOLOE Open-Vocabulary Segmenter
        model = YOLOE(model_path)
        load_time_ms = (time.time() - load_start) * 1000
        diagnostics.append(f"Successfully loaded YOLOE-11S Open-Vocabulary model in {load_time_ms:.1f}ms.")

        # 2. Configure Open-Vocabulary Prompts dynamically!
        if target_class and target_class != "all" and target_class != "*":
            # Supports single classes as well as comma-separated multi-class queries!
            target_classes = [c.strip() for c in target_class.split(",") if c.strip()]
            model.set_classes(target_classes)
            diagnostics.append(f"Setting YOLOE active text vocabulary prompts to: {target_classes}")
        else:
            # Default rich sandbox vocabulary for open-set discovery
            default_classes = ["person", "laptop", "cell phone", "cup", "chair", "car", "dog", "backpack"]
            model.set_classes(default_classes)
            diagnostics.append(f"Setting YOLOE open-set discovery vocabulary prompts to: {default_classes}")

        # 3. Measure Inference Speed
        inference_start = time.time()
        results = model.predict(image_path, verbose=False)
        inference_time_ms = (time.time() - inference_start) * 1000
        diagnostics.append(f"YOLOE open-world inference completed in {inference_time_ms:.1f}ms.")

        orig_w = results[0].orig_shape[1]
        orig_h = results[0].orig_shape[0]
        diagnostics.append(f"Image source dimensions: {orig_w}x{orig_h} pixels.")

        # 4. Parse Detections and Masks
        detections = []
        for result in results:
            boxes = result.boxes
            masks = result.masks
            
            for idx, box in enumerate(boxes):
                cls_id = int(box.cls[0].item())
                class_name = model.names[cls_id]
                conf = float(box.conf[0].item())
                xyxy = box.xyxy[0].tolist() # Bounding box: [x_min, y_min, x_max, y_max]
                
                det = {
                    "class": class_name,
                    "confidence": conf,
                    "box": xyxy
                }
                
                # Extract exact shape polygon contours if masks exist
                if masks is not None and len(masks.xy) > idx:
                    # masks.xy[idx] is a numpy array of points [[x1, y1], [x2, y2], ...]
                    polygon_points = masks.xy[idx].tolist()
                    det["polygon"] = polygon_points
                
                detections.append(det)

        diagnostics.append(f"YOLOE successfully segmented {len(detections)} matching objects.")

        print(json.dumps({
            "success": True,
            "model": "yoloe-11s-seg",
            "diagnostics": diagnostics,
            "detections": detections
        }))

    except Exception as e:
        print(json.dumps({"success": False, "error": f"Exception raised inside YOLOE Python script: {str(e)}"}))

if __name__ == "__main__":
    main()
