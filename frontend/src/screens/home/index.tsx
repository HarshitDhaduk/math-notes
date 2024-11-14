import { useCallback, useEffect, useRef, useState } from 'react'
import { SWATCHES } from '@/constants'
import { ColorSwatch, Group } from '@mantine/core'
import { Button } from '@/components/ui/button'
import Draggable from 'react-draggable'
import axios from 'axios'

interface Response {
  expr: string
  result: string
  assign: boolean
}

interface GenerateResponse {
  expression: string
  answer: string
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [color, setColor] = useState('rgb(255, 255, 255)')
  const [reset, setReset] = useState(false)
  const [result, setResult] = useState<GenerateResponse>()
  const [latexExpression, setLatexExpression] = useState<Array<string>>([])
  const [latexPosition, setLatexPosition] = useState({ x: 0, y: 0 })
  const [dictVariables, setDictVariables] = useState({})

  useEffect(() => {
    if (reset) {
      resetCanvas()
      setLatexExpression([])
      setResult(undefined)
      setDictVariables({})
      setReset(false)
    }
  }, [reset])

  useEffect(() => {
    if (latexExpression.length > 0 && window.MathJax) {
      setTimeout(() => {
        window.MathJax.Hub.Queue(['Typeset', window.MathJax.Hub])
      }, 0)
    }
  }, [latexExpression])

  useEffect(() => {
    if (result) {
      renderLatexToCanvas(result.expression, result.answer)
    }
  }, [result])

  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      if (ctx) {
        canvas.width = window.innerWidth
        canvas.height = window.innerHeight - canvas.offsetTop
        ctx.lineCap = 'round'
        ctx.lineWidth = 3
      }
    }
    const script = document.createElement('script')
    script.src =
      'https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.9/MathJax.js?config=TeX-MML-AM_CHTML'

    script.async = true
    document.head.appendChild(script)

    script.onload = () => {
      window.MathJax.Hub.Config({
        tex2jax: {
          inlineMath: [
            ['$', '$'],
            ['\\(', '\\)'],
          ],
        },
      })
    }

    return () => {
      document.head.removeChild(script)
    }
  }, [])

  const renderLatexToCanvas = useCallback(
    (expression: string, answer: string) => {
      const latex = ` {${expression} = ${answer}} `
      setLatexExpression((prev) => [...prev, latex])

      const canvas = canvasRef.current
      if (canvas) {
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height)
        }
      }
    },
    []
  )

  const sendData = async () => {
    const canvas = canvasRef.current
    if (canvas) {
      const response = await axios({
        method: 'POST',
        url: `${import.meta.env.VITE_API_URL}/calculate`,
        data: {
          image: canvas.toDataURL('image/png'),
          dictVariables: dictVariables,
        },
      })
      const responseData = await response.data
      responseData.data.forEach((data: Response) => {
        if (data.assign === true) {
          setDictVariables({ ...dictVariables, [data.expr]: data.result })
        }
      })

      const ctx = canvas.getContext('2d')
      const imageData = ctx!.getImageData(0, 0, canvas.width, canvas.height)
      let minX = canvas.width,
        minY = canvas.height,
        maxX = 0,
        maxY = 0
      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          if (imageData.data[(y * canvas.width + x) * 4 + 3] > 0) {
            if (x < minX) minX = x
            if (y < minY) minY = y
            if (x > maxX) maxX = x
            if (y > maxY) maxY = y
          }
        }
      }

      const centerX = (minX + maxX) / 2
      const centerY = (minY + maxY) / 2

      setLatexPosition({ x: centerX, y: centerY })

      responseData.data.forEach((data: Response) => {
        setTimeout(() => {
          setResult({ expression: data.expr, answer: data.result })
        }, 200)
      })
    }
  }
  const resetCanvas = () => {
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
    }
  }
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (canvas) {
      canvas.style.background = 'black'
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.beginPath()
        ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY)
        setIsDrawing(true)
      }
    }
  }
  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) {
      return
    }
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.strokeStyle = color
        ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY)
        ctx.stroke()
      }
    }
  }

  return (
    <>
      <div className='grid grid-cols-3 gap-2'>
        <Button
          onClick={() => setReset(true)}
          className='z-20 bg-black text-white'
          variant='default'
          color='black'
        >
          Reset
        </Button>
        <Group className='z-20'>
          {SWATCHES.map((swatchColor: string) => (
            <ColorSwatch
              key={swatchColor}
              color={swatchColor}
              onClick={() => setColor(swatchColor)}
            />
          ))}
        </Group>
        <Button
          onClick={sendData}
          className='z-20 bg-black text-white'
          variant='default'
          color='black'
        >
          Calculate
        </Button>
      </div>
      <canvas
        ref={canvasRef}
        id='canvas'
        className='absolute top-0 left-0 w-full h-full'
        onMouseDown={startDrawing}
        onMouseUp={stopDrawing}
        onMouseMove={draw}
      />
      {latexExpression &&
        latexExpression.map((latex: string, index: number) => (
          <Draggable
            key={index}
            defaultPosition={{ x: latexPosition.x, y: latexPosition.y }}
            onStop={(_, data) => setLatexPosition({ x: data.x, y: data.y })}
          >
            <div className='absolute text-white'>
              <div className='latex-content'>{latex}</div>
            </div>
          </Draggable>
        ))}
    </>
  )
}
