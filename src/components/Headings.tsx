import { PropsWithChildren } from 'react'

// from https://tailwind-elements.com/docs/standard/components/headings/

export function H1({ children }: PropsWithChildren<{}>) {
  return <h1 className="font-bold tracking-tighter leading-tight text-5xl mt-0 mb-2">{children}</h1>
}

export function H2({ children }: PropsWithChildren<{}>) {
  return <h4 className="font-bold tracking-tighter leading-tight text-4xl mt-0 mb-2">{children}</h4>
}

export function H3({ children }: PropsWithChildren<{}>) {
  return <h4 className="font-bold tracking-tighter leading-tight text-3xl mt-0 mb-2">{children}</h4>
}

export function H4({ children }: PropsWithChildren<{}>) {
  return <h4 className="font-bold tracking-tighter leading-tight text-2xl mt-0 mb-2">{children}</h4>
}

export function H6({ children }: PropsWithChildren<{}>) {
  return <h6 className="font-bold tracking-tighter leading-tight text-base mt-0 mb-2">{children}</h6>
}
