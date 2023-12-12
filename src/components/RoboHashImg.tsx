import { useEffect, useState, useMemo } from 'react'
import { QuestionMarkCircleIcon } from '@heroicons/react/24/outline'

import { Spinner } from './Spinner'

import { hashWithSha256 } from '../util/utils'

interface RoboHashImgProps {
  value: string
  alt?: string
  title?: string
  raw?: boolean
  className?: string
}

export function RoboHashImg({ value, alt = value, title = value, raw = false, className = '' }: RoboHashImgProps) {
  const image = useMemo(() => (raw ? value : hashWithSha256(value)), [value, raw])
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
        <div className={`grid ${className || ''}`}>
          <Spinner />
        </div>
      )}
      <div className={`${showLoader ? 'hidden' : 'block transition-all duration-500'}`}>
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
    <div className={`w-${size} h-${size} rounded-full shadow-lg-gray bg-base-300 flex justify-center items-center`}>
      <QuestionMarkCircleIcon className={`w-${size} h-${size}`} />
    </div>
  )
}
