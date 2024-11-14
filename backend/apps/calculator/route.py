from fastapi import APIRouter
import base64
from io import BytesIO
from apps.calculator.utils import analyze_image
from schema import ImageData
from PIL import Image

router = APIRouter()

@router.post('')
async def run(data: ImageData):
 image_data = base64.b64decode(data.image.split(',')[1])
 image_bytes = BytesIO(image_data)
 image = Image.open(image_bytes)
 responses = analyze_image(image, dictVariables=data.dictVariables)
 data = []
 for response in responses:
  data.append(response) 
  print('response in route: ', response) # for testing purposes only
 return {
  "message": "Image processed successfully",
  "status": "success",
  "data":data
 }