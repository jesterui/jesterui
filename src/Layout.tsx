import { PropsWithChildren, ReactNode, useState } from 'react'
import { Drawer, DrawerProps } from 'react-daisyui'
import { Sidebar } from './components/Sidebar'
import { Navbar } from './components/Navbar'

type LayoutProps = {
  title: ReactNode
  drawer: Partial<DrawerProps>
}

export function Layout({ title, children, drawer }: PropsWithChildren<LayoutProps>) {
  const [sidebarVisible, setSitebarVisible] = useState(false)
  const toggleSidebarVisible = () => setSitebarVisible((current) => !current)

  return (
    <>
      <Drawer
        {...drawer}
        sideClassName="z-50"
        side={<Sidebar title={title} />}
        end={false}
        open={sidebarVisible}
        onClickOverlay={toggleSidebarVisible}
        className="min-h-screen"
      >
        <div className="md:container mx-auto">
          <Navbar title={title} toggleSidebar={toggleSidebarVisible} />
          <div className="px-4 pb-32">{children}</div>
        </div>
      </Drawer>
    </>
  )
}
