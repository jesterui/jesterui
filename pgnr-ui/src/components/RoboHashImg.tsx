import React, { useEffect, useState } from 'react'
import { hashWithSha256 } from '../util/jester'

interface RoboHashImgProps {
  value: string
  alt?: string
  title?: string
  raw?: boolean
  className?: string
}

export function RoboHashImg(props: RoboHashImgProps) {
  const { value, alt = value, title = value, raw = false, className = '' } = props

  const [image, setImage] = useState(raw ? value : hashWithSha256(value))

  useEffect(() => {
    setImage(raw ? value : hashWithSha256(value))
  }, [value, raw])

  return <img className={className} src={`https://robohash.org/${image}`} title={value} alt={alt} />
}
