import { useState, useEffect } from 'react'

import * as AppUtils from '../util/app'

interface SetWindowTitleProps {
  text?: string
  transform?: (title: string) => string
}

const DEFAULT_TRANSFORM = (title: string) => AppUtils.windowTitle(title)

export function useSetWindowTitle({ text, transform = DEFAULT_TRANSFORM }: SetWindowTitleProps) {
  const [previousTitle] = useState(document.title)
  const [title, setTitle] = useState(text || previousTitle)

  useEffect(() => {
    document.title = transform(title)
    return () => {
      document.title = previousTitle
    }
  }, [previousTitle, title])

  return setTitle
}
