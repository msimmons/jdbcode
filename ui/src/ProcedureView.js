import React from 'react';
import { BaseView } from './BaseView'
import {CircularProgress, Chip, Card, CardHeader, CardContent, Typography, TableHead, TableRow, TableBody, TableCell, Table} from '@material-ui/core'
import CancelIcon from '@material-ui/icons/Cancel'
import ErrorIcon from '@material-ui/icons/Error'

const initialState = {
  status: 'executing',
  procedure: undefined,
  rows: [],
  maxHeight: 100,
  error: undefined
}

export class ProcedureView extends BaseView {

  columns = [
    { label: 'Name', prop: 'name', renderHeader: this.renderHeader, render: this.renderCell },
    { label: 'Type', prop: 'type', renderHeader: this.renderHeader, render: this.renderCell },
    { label: 'In/Out', prop: 'inOut', renderHeader: this.renderHeader, render: this.renderCell },
    { label: 'Default', prop: 'default', renderHeader: this.renderHeader, render: this.renderCell },
    { label: 'Null?', prop: 'nullable', renderHeader: this.renderHeader, render: this.renderCell }
  ]

  constructor(props) {
    super(props)
    this.state = initialState
    /*global acquireVsCodeApi */
    this.vscode = (typeof acquireVsCodeApi === 'function') ? acquireVsCodeApi() : undefined
    window.addEventListener('message', (event) => {
      this.update(event)
    })
  }

  update = (event) => {
    let procedure = event.data.object.resolved
    console.log(procedure)
    if (!procedure) {
      return
    }
    let rows = procedure.params
    this.setState({ ...this.state, procedure: procedure, rows: rows, status: event.data.status, error: event.data.error})
  }

  cancel = () => {
    console.log('Canceling')
  }

  renderError() {
    return (
      <div>
        <Card elevation={4} style={{border: '1px solid red', 'margin': '10px'}}>
          <CardHeader title="Error describing" subheader={this.state.table.name} avatar={<ErrorIcon color="error"/>}/>
          <CardContent>
            <Typography variant="h6" color="default" component="p">
              {this.state.error}
            </Typography>
          </CardContent>
        </Card>
      </div>
    )
  }

  renderExecuting() {
    return (
      <div>
        <CircularProgress color="default"/>
        <Chip size="small" clickable onClick={this.cancel} label="Cancel" icon={<CancelIcon/>}/>
        <pre>Describing Table</pre>
      </div>
    )
  }

  renderProcedure() {
    return (
      <div>
        <Table size="small" maxHeight={this.state.maxHeight} stickyHeader>
          <TableHead>
            <TableRow>
              {this.columns.map(col => {
                return <TableCell align="left">{col.label}</TableCell>
              })}
            </TableRow>
          </TableHead>
          <TableBody>
            {this.state.rows.map(row => {
              return <TableRow key={row.name}>
                {this.columns.map(col => {
                  return <TableCell align="left">{col.render(row, col)}</TableCell>
                })}
              </TableRow>
            })}
          </TableBody>
        </Table>
      </div>
    )
  }

  render() {
    if (this.state.error) {
      return this.renderError()
    }
    if (this.state.status === 'executing') {
      return this.renderExecuting()
    }
    else {
      return this.renderProcedure()
    }
  }
}
