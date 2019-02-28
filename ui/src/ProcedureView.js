import React from 'react';
import { BaseView } from './BaseView'
import { Table, Button, Alert, Icon } from 'element-react'

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
        <Alert showIcon type="error" title={this.state.procedure.name} description={this.state.error} closable={false} />
      </div>
    )
  }

  renderExecuting() {
    return (
      <div>
        <Button size="mini" onClick={this.cancel}>Cancel</Button>
        <div><Icon name="loading" /></div>
        <div>
          <span>Describing procedure</span>
        </div>
      </div>
    )
  }

  renderProcedure() {
    return (
      <div >
        <Table data={this.state.rows} columns={this.columns} border emptyText="No Data" maxHeight={this.state.maxHeight} />
      </div>
    );
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
