import React from 'react'
import { withRouter } from 'react-router'
import { executeFetchData } from '../helpers/fetchData/fetchData'

const ssrFetchData = DecoratedComponent => {
  @withRouter
  class ssrFetchData extends React.Component {
    constructor (props) {
      super(props)
      this.state = { fetched: false, params: props.match.params }
      this.recallFetchData = false
      this.loaderRequired = false
    }

    static getDerivedStateFromProps (nextProps, prevState) {
      if (nextProps && !nextProps.disableFetchData) {
        const { params = {} } = prevState

        if (Object.keys(params).length > 0 && params !== nextProps.match.params) {
          return { fetched: false, params }
        }
      }

      return {}
    }

    componentWillReceiveProps (nextProps) {
      if (nextProps && !nextProps.disableFetchData) {
        const { params = {} } = this.props.match

        if (Object.keys(params).length > 0 && params !== nextProps.match.params) {
          this.setState({ fetched: false })
        }
      }
    }

    fetchData () {
      if (this.recallFetchData) {
        this.loaderRequired = true
        const req = {} // fake version of Node's req, as passed as argument

        executeFetchData(DecoratedComponent, this.props.match, req)
          .then(componentWithData => {
            DecoratedComponent.defaultProps = componentWithData.defaultProps
            this.setState({ fetched: true })
          })
          .catch(error => {
            console.warn('Failed to fetch some props for fetchData. Rendering anyway...', error)
            this.setState({ fetched: true })
          })
      }
    }

    extractFromWindow () {
      if (typeof window !== 'undefined') {
        const { _dataFromServerRender = {} } = window.__STATE || {}
        const props = _dataFromServerRender[DecoratedComponent.displayName]

        if (props) {
          DecoratedComponent.defaultProps = {...DecoratedComponent.defaultProps, ...props}
        } else {
          this.recallFetchData = true
          this.loaderRequired = true
        }
      }
    }

    render () {
      if (!this.state.fetched && typeof window !== 'undefined') {
        this.extractFromWindow()

        if (this.recallFetchData && !this.props.disableFetchData) {
          this.fetchData()
        }
      } else if (typeof window === 'undefined') {
        this.loaderRequired = false // on server...
      }

      const loading = !this.state.fetched && this.loaderRequired && !this.props.disableFetchData
      return <DecoratedComponent {...this.props} loading={loading} />
    }
  }

  /** Defines what JSX components we need to fetchData for */
  ssrFetchData.ssrWaitsFor = DecoratedComponent.ssrWaitsFor
  /** Unique name for this component, to use for checking on window state */
  ssrFetchData.displayName = DecoratedComponent.displayName || DecoratedComponent.name
  /** Make the static fetchData method available, pass through, as HOCs lose statics */
  ssrFetchData.fetchData = DecoratedComponent.fetchData

  return ssrFetchData
}

export default ssrFetchData
