import * as JesterUtils from '../../util/jester'

import styles from './JesterId.module.css'

interface JesterIdProps {
  jesterId: JesterUtils.JesterId
}

export default function JesterId({ jesterId }: JesterIdProps) {
  return <code className={styles['jester-id']}>{jesterId}</code>
}
