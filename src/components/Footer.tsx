import { Footer as DaisyFooter } from 'react-daisyui'
import { Link } from 'react-router-dom'
import ROUTES from '../routes'
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline'

export function Footer() {
  return (
    <div className="bg-base-300 text-base-300-content sticky top-[100vh] p-10">
      <DaisyFooter className="md:container mx-auto">
        <div>
          <DaisyFooter.Title>App</DaisyFooter.Title>
          <Link className="link link-hover" to={ROUTES.search}>
            Search
          </Link>
          <Link className="link link-hover" to={ROUTES.settings}>
            Settings
          </Link>
          <Link className="link link-hover" to={ROUTES.faq}>
            FAQ
          </Link>
        </div>
        <div>
          <DaisyFooter.Title>Software</DaisyFooter.Title>
          <Link
            className="flex gap-1 items-center link link-hover"
            to="https://github.com/jesterui/jesterui"
            rel="noopener noreferrer"
            target="_blank"
          >
            GitHub
            <ArrowTopRightOnSquareIcon className="h-4 w-4" />
          </Link>
          <Link
            className="flex gap-1 items-center link link-hover"
            to="https://raw.githubusercontent.com/jesterui/jesterui/devel/LICENSE"
            rel="noopener noreferrer"
            target="_blank"
          >
            License
            <ArrowTopRightOnSquareIcon className="h-4 w-4" />
          </Link>
        </div>
        <div></div>
        <div></div>
      </DaisyFooter>
    </div>
  )
}
