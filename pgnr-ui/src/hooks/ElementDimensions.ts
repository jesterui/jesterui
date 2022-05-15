import { useState, useEffect } from 'react'

function getWindowDimensions() {
  const { innerWidth: width, innerHeight: height } = window
  return {
    width,
    height,
  }
}

export function useWindowDimensions() {
  const [windowDimensions, setWindowDimensions] = useState(getWindowDimensions())

  useEffect(() => {
    function handleResize() {
      setWindowDimensions(getWindowDimensions())
    }

    const abortCtrl = new AbortController()
    window.addEventListener('resize', handleResize, { signal: abortCtrl.signal })

    return () => abortCtrl.abort()
  }, [])

  return windowDimensions
}

export const useResize = (elementRef: React.RefObject<HTMLDivElement>) => {
  const [width, setWidth] = useState(0)
  const [height, setHeight] = useState(0)

  useEffect(() => {
    if (!elementRef.current) return

    setWidth(elementRef.current.offsetWidth)
    setHeight(elementRef.current.offsetHeight)

    const handleResize = () => {
      if (!elementRef.current) return

      setWidth(elementRef.current.offsetWidth)
      setHeight(elementRef.current.offsetHeight)
    }

    const abortCtrl = new AbortController()
    window.addEventListener('resize', handleResize, { signal: abortCtrl.signal })

    return () => abortCtrl.abort()
  }, [elementRef])

  return { width, height }
}
