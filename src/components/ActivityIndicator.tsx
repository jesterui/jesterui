import '../components/ActivityIndicator.css'

export const ActivityIndicator = ({ isOn, isError = false }: { isOn: boolean; isError?: boolean | null }) => {
  return (
    <span
      className={`activity-indicator ${
        isError ? 'activity-indicator-error' : isOn ? 'activity-indicator-on' : 'activity-indicator-off'
      }`}
    />
  )
}
