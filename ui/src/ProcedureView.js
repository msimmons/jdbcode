import React from 'react';
import { BaseView } from './BaseView'
import {TableHead, TableRow, TableBody, TableCell, Table} from '@material-ui/core'

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
      return this.renderError(this.state.error, this.state.procedure.name)
    }
    if (this.state.status === 'executing') {
      return this.renderExecuting('Describing Table', this.cancel)
    }
    else {
      return this.renderProcedure()
    }
  }
}
