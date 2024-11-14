from pydantic import BaseModel

class ImageData(BaseModel):
 image: str
 dictVariables: dict