import { PropsWithChildren, useState, useEffect, useRef } from 'react'
import { Button, ButtonProps } from 'react-daisyui'

import { copyToClipboard } from '../util/utils'

interface CopyableProps {
  value: string
  onSuccess?: () => void
  onError?: (e: Error) => void
  buttonProps?: Partial<ButtonProps>
}

function Copyable({ value, onError, onSuccess, buttonProps, children }: PropsWithChildren<CopyableProps>) {
  const valueFallbackInputRef = useRef(null)

  return (
    <>
      <Button
        type="button"
        {...buttonProps}
        onClick={() => copyToClipboard(value, valueFallbackInputRef.current!).then(onSuccess, onError)}
      >
        {children}
      </Button>
      <input
        readOnly
        aria-hidden
        ref={valueFallbackInputRef}
        value={value}
        style={{
          position: 'absolute',
          left: '-9999px',
          top: '-9999px',
        }}
      />
    </>
  )
}

interface CopyButtonProps extends CopyableProps {}

export function CopyButton({ value, onSuccess, onError, children, ...props }: PropsWithChildren<CopyButtonProps>) {
  return (
    <Copyable
      value={value}
      onError={onError}
      onSuccess={onSuccess}
      data-bs-toggle="tooltip"
      data-bs-placement="left"
      {...props}
    >
      {children}
    </Copyable>
  )
}

interface CopyButtonWithConfirmationProps extends CopyButtonProps {
  text: string
  successText: string
  successTextTimeout?: number
}

export function CopyButtonWithConfirmation({
  value,
  onSuccess,
  onError,
  text,
  successText = text,
  successTextTimeout = 1_500,
  buttonProps,
  ...props
}: CopyButtonWithConfirmationProps & { disabled?: boolean }) {
  const [showValueCopiedConfirmation, setShowValueCopiedConfirmation] = useState(false)
  const [valueCopiedFlag, setValueCopiedFlag] = useState(0)

  useEffect(() => {
    if (valueCopiedFlag < 1) return

    setShowValueCopiedConfirmation(true)
    const timer = setTimeout(() => {
      setShowValueCopiedConfirmation(false)
    }, successTextTimeout)

    return () => clearTimeout(timer)
  }, [valueCopiedFlag, successTextTimeout])

  return (
    <CopyButton
      buttonProps={buttonProps}
      value={value}
      onError={onError}
      onSuccess={() => {
        setValueCopiedFlag((current) => current + 1)
        onSuccess && onSuccess()
      }}
      {...props}
    >
      {showValueCopiedConfirmation ? (
        <div className="d-flex justify-content-center align-items-center">{successText}</div>
      ) : (
        <>{text}</>
      )}
    </CopyButton>
  )
}
