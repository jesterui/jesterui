import React, { useEffect, useState } from 'react'

import { hashWithSha256 } from '../util/jester'

// @ts-ignore
import Icon from '@material-tailwind/react/Icon'
import { Spinner } from './Spinner'

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

interface RoboHashImgWithLoaderProps extends RoboHashImgProps {
  durationInMillis?: number
}

// Robohash responses can be quite slow.
// In case the image is a more important part of the page,
// show a spinner while loading the image in the background.
export function RoboHashImgWithLoader(props: RoboHashImgWithLoaderProps) {
  const { value, alt, title, raw, className = '', durationInMillis = 350 } = props

  const [showLoader, setShowLoader] = useState(true)

  useEffect(() => {
    const abortCtrl = new AbortController()
    const timer = setTimeout(() => {
      if (abortCtrl.signal.aborted) return
      setShowLoader(false)
    }, durationInMillis)

    return () => {
      clearTimeout(timer)
      abortCtrl.abort()
    }
  }, [durationInMillis])

  return (
    <>
      {showLoader && (
        <div className={className}>
          <Spinner />
        </div>
      )}
      <div className={`${showLoader ? 'hidden opacity-10' : 'block transition-all duration-500'}`}>
        <RoboHashImg value={value} alt={alt} title={title} raw={raw} className={className} />
      </div>
    </>
  )
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
