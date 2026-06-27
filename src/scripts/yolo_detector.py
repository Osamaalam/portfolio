import sys
import json
import os

# Suppress standard YOLO logging before importing ultralytics
os.environ["YOLO_VERBOSE"] = "False"

try:
    from ultralytics import YOLO
except ImportError:
    print(json.dumps({"success": False, "error": "The 'ultralytics' library is not installed in Python environment."}))
    sys.exit(1)

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "No image file path provided to python script."}))
        return

    image_path = sys.argv[1]
    if not os.path.exists(image_path):
        print(json.dumps({"success": False, "error": f"Image file not found: {image_path}"}))
        return

    try:
        # Resolve the model file location in the root directory relative to this script
        script_dir = os.path.dirname(os.path.abspath(__file__))
        model_path = os.path.join(script_dir, "..", "..", "yoloe-11s-seg.pt")
        model_path = os.path.abspath(model_path)

        if not os.path.exists(model_path):
            print(json.dumps({"success": False, "error": f"Model file 'yoloe-11s-seg.pt' not found at expected path: {model_path}"}))
            return

        # Load the custom YOLOv11 Segmentation model
        model = YOLO(model_path)
        
        # Perform segmentations with suppressed verbose logs to keep stdout clean
        results = model(image_path, verbose=False)
        
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

        print(json.dumps({
            "success": True,
            "model": "yoloe-11s-seg",
            "detections": detections
        }))

    except Exception as e:
        print(json.dumps({"success": False, "error": f"Exception raised inside Python script: {str(e)}"}))

if __name__ == "__main__":
    main()
