import { useRef } from 'react'
import { CreateGameAndRedirectButton } from '../components/CreateGameButton'
import { GenerateRandomIdentityButton } from '../components/IdentityButtons'

// @ts-ignore
import Button from '@material-tailwind/react/Button'

export function GameStartOrNewIdentityButton({ hasPrivateKey }: { hasPrivateKey: boolean }) {
  const createNewGameButtonRef = useRef<HTMLButtonElement>(null)
  const generateRandomIdentityButtonRef = useRef<HTMLButtonElement>(null)

  return (
    <>
      {hasPrivateKey ? (
        <>
          <Button
            color="green"
            buttonType="filled"
            size="regular"
            rounded={false}
            block={false}
            iconOnly={false}
            ripple="light"
            ref={createNewGameButtonRef}
            disabled={!hasPrivateKey}
            className="w-40"
          >
            Start new game
            <CreateGameAndRedirectButton buttonRef={createNewGameButtonRef} />
          </Button>
        </>
      ) : (
        <>
          <Button
            color="deepOrange"
            buttonType="filled"
            size="regular"
            rounded={false}
            block={false}
            iconOnly={false}
            ripple="light"
            ref={generateRandomIdentityButtonRef}
            className="w-40"
          >
            New Identity
            <GenerateRandomIdentityButton buttonRef={generateRandomIdentityButtonRef} />
          </Button>
        </>
      )}
    </>
  )
}
