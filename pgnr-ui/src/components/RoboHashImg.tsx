import React, { useEffect, useState } from 'react'
import { hashWithSha256 } from '../util/jester'

// @ts-ignore
import Icon from '@material-tailwind/react/Icon'

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

  return <img className={className} src={`https://robohash.org/${image}`} title={title} alt={alt} />
}

interface UnknownImgProps {
  size?: number
}

export function UnknownImg({ size = 24 }: UnknownImgProps) {
  return (
    <div
      className={`w-${size} h-${size} rounded-full shadow-lg-gray bg-blue-gray-500 flex justify-center items-center`}
    >
      <Icon name="question_mark" size="xxl" />
    </div>
  )
}
