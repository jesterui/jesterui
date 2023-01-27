import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from 'react-daisyui'

import { CreateGameAndRedirectButtonHook } from '../components/CreateGameButton'
import { GenerateRandomIdentityButton } from '../components/IdentityButtons'

import ROUTES from '../routes'

export function CreateGameOrNewIdentityButton({
  hasPrivateKey,
  hasPublicKey,
}: {
  hasPrivateKey: boolean
  hasPublicKey?: boolean
}) {
  const createNewGameButtonRef = useRef<HTMLButtonElement>(null)

  return (
    <>
      {hasPrivateKey ? (
        <>
          <Button color="success" ref={createNewGameButtonRef} disabled={!hasPrivateKey} className="w-40">
            Start new game
            <CreateGameAndRedirectButtonHook buttonRef={createNewGameButtonRef} />
          </Button>
        </>
      ) : (
        <>
          <LoginOrNewIdentityButton hasPublicKey={hasPublicKey || false} />
        </>
      )}
    </>
  )
}

export function LoginOrNewIdentityButton({ hasPublicKey }: { hasPublicKey: boolean }) {
  const navigate = useNavigate()

  const generateRandomIdentityButtonRef = useRef<HTMLButtonElement>(null)

  const loginButtonClicked = () => navigate(ROUTES.login)

  return (
    <div className="flex justify-center items-center space-x-4 my-4">
      {hasPublicKey && (
        <>
          <Button color="primary" className="w-40" onClick={loginButtonClicked}>
            Login
          </Button>

          <div>or</div>
        </>
      )}

      <Button color="secondary" variant="outline" ref={generateRandomIdentityButtonRef} className="w-40">
        New Identity
        <GenerateRandomIdentityButton buttonRef={generateRandomIdentityButtonRef} />
      </Button>
    </div>
  )
}
