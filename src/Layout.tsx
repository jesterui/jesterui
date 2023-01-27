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
        side={<Sidebar title={title} />}
        end={false}
        mobile={false}
        open={sidebarVisible}
        onClickOverlay={toggleSidebarVisible}
        className="font-sans"
      >
        <div className="md:container mx-auto">
          <Navbar title={title} toggleSidebar={toggleSidebarVisible} />
          <div className="px-4 pb-32">{children}</div>
        </div>
      </Drawer>
    </>
  )
}
