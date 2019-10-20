import React, { Component } from 'react';
import {CircularProgress, Card, CardHeader, CardContent, Chip, Typography} from '@material-ui/core'
import CancelIcon from '@material-ui/icons/Cancel'
import ErrorIcon from '@material-ui/icons/Error'

/**
 * A Component that deals with size changes
 */
export class BaseView extends Component {

  componentWillMount() {
    this.updateDimensions()
  }
  
  componentDidMount() {
    window.addEventListener("resize", this.updateDimensions)
  }
  componentWillUnmount() {
    window.removeEventListener("resize", this.updateDimensions)
  }

  updateDimensions = () => {
    var height = window.innerHeight - 50
    this.setState({...this.state, maxHeight: height})
  }

  /**
   * These renders take care of ensuring that overflow is triggered
   */
  renderHeader = (column) => {
    return (<span style={{whiteSpace: "nowrap"}}>{column.label}</span>)
  }

  /**
   * These renders take care of ensuring that overflow is triggered
   */
  oldRenderCell = (row, column, ndx) => {
    return (<span style={{whiteSpace: "nowrap"}}>{row[column.prop]}</span>)
  }

  renderCell = (row, column, ndx) => {
    return (<span>{row[column.prop]}</span>)
  }

  renderExecuting = (sqlText, doCancel) => {
    return (
      <Card elevation={4} style={{border: '1px solid green', 'margin': '10px'}}>
        <CardHeader avatar={<CircularProgress />} title={<Chip icon={<CancelIcon/>} label="Cancel" title="Cancel" clickable onClick={doCancel}/>}/>
        <CardContent>
          <Typography variant="body1" component="pre" style={{margin: '10px'}}>
            {sqlText}
          </Typography>
        </CardContent>
      </Card>
    )
  }

  renderError = (errorText, sqlText) => {
    return (
      <Card elevation={4} style={{border: '1px solid red', 'margin': '10px'}}>
      <CardHeader title="Error" avatar={<ErrorIcon color="error"/>} />
        <CardContent>
          <Typography variant="h6" component="p">
            {errorText}
          </Typography>
        </CardContent>
        <Typography variant="body1" component="pre" style={{margin: '10px'}}>
        {sqlText}
      </Typography>
      </Card>
    )
  }
}

