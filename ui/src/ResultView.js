import React from 'react';
import { BaseView } from './BaseView'
import { Table, Button, Input, Layout, Tag, Alert, Icon } from 'element-react'

const initialState = {
  statement: {
    id: undefined,
    sql: undefined
  },
  result: {
    columns: [],
    error: undefined,
    executionCount: 0,
    executionTime: 0,
    fetchTime: 0,
    id: null,
    moreRows: false,
    rows: [],
    status: 'executing',
    type: 'query',
    updateCount: 0
  },
  columns: [],
  rows: [],
  maxHeight: 100
}

export class ResultView extends BaseView {

  vscode = undefined
  colDefs = []

  constructor(props) {
    super(props)
    this.state = initialState
    /*global acquireVsCodeApi */
    this.vscode = (typeof acquireVsCodeApi === 'function') ? acquireVsCodeApi() : undefined
    window.addEventListener('message', (event) => {
      this.update(event)
    })
  }

  postMessage(command) {
    if (this.vscode) {
      this.vscode.postMessage({command: command, id: this.state.statement.id})
    }
    else {
      console.log(command, this.state.statement.id)
    }
  }

  inTransaction = () => {
    return this.state.result.status === 'executed' && this.state.result.type === 'crud'
  }

  update = (event) => {
    //var height = window.innerHeight - 50
    // Only map the columns once, they won't change
    if (!this.colDefs || this.colDefs.length === 0) {
      let totalLen = 0
      this.colDefs = event.data.result.columns.map((column, ndx) => {
        totalLen += column.length
        return {label: column, prop: column, columnKey: ndx, render: this.renderCell, renderHeader: this.renderHeader }
      })
      this.colDefs.forEach((column) => {
        let relativeWidth = Math.floor((((column.label.length+5)*this.colDefs.length)/totalLen)*100)
        column.minWidth = relativeWidth
        column.width = relativeWidth
      })
    }
    let rows = event.data.result.rows.map((row) => {
      let rowObject = {}
      this.colDefs.forEach((column, ndx) => {
        rowObject[column.prop] = row[ndx]
      })
      return rowObject
    })
    this.setState({statement: event.data.statement, result: event.data.result, rows: rows, columns: this.colDefs, maxHeight: this.state.maxHeight})
  }

  fetch = () => {
    let newResult = {...this.state.result, status: 'executing'}
    this.setState({statement: this.state.statement, result: newResult})
    this.postMessage('fetch')
  }

  reexecute = () => {
    let newResult = {...this.state.result, status: 'executing'}
    this.setState({statement: this.state.statement, result: newResult})
    this.postMessage('reexecute')
  }

  export = () => {
    this.postMessage('export')
  }

  exportAll = () => {
    this.postMessage('export-all')
  }

  commit = () => {
    this.postMessage('commit')
    let newResult = {...this.state.result, status: 'committed'}
    this.setState({statement: this.state.statement, result: newResult})
  }

  rollback = () => {
    this.postMessage('rollback')
    let newResult = {...this.state.result, status: 'committed'}
    this.setState({statement: this.state.statement, result: newResult})
  }

  cancel = () => {
    this.postMessage('cancel')
    let newResult = {...this.state.result, status: 'cancelled'}
    this.setState({statement: this.state.statement, result: newResult})
  }

  renderError() {
    return (
      <div>
        <Alert showIcon type="error" title="SQL Error" description={this.state.result.error} closable={false}/>
        <pre>{this.state.statement.sql}</pre>
      </div>
    )
  }

  renderExecuting() {
    return (
      <div>
        <div><Icon name="loading"/></div>
        <Button size="mini" onClick={this.cancel}>Cancel</Button>
        <pre>{this.state.statement ? this.state.statement.sql : ""}</pre>
      </div>
    )
  }

  renderQuery() {
    return (
      <div>
        <Layout.Row>
          <Layout.Col span="8">
            Executions <Tag type="gray" size="mini">{this.state.result.executionCount}</Tag>&nbsp;
            Elapsed <Tag type="gray" size="mini">{this.state.result.executionTime}</Tag>&nbsp;
            Rows <Tag type="gray" size="mini">{this.state.result.rows.length}</Tag>&nbsp;
            More? <Tag type="gray" size="mini">{this.state.result.moreRows ? 'true' : 'false'}</Tag>&nbsp;
          </Layout.Col>
          <Layout.Col span="10">
            <Button.Group>
              <Button size="mini" onClick={this.reexecute}>Refresh</Button>
              <Button size="mini" disabled={this.state.result.rows.length===0} onClick={this.export}>Export</Button>
              <Button size="mini" disabled={this.state.result.rows.length===0 || !this.state.result.moreRows} onClick={this.fetch}>Fetch</Button>
              <Button size="mini" disabled={this.state.result.rows.length===0 || !this.state.result.moreRows} onClick={this.exportAll}>Export All</Button>
            </Button.Group>
          </Layout.Col>
          <Layout.Col span="6">
            <Input ></Input>
          </Layout.Col>
        </Layout.Row>
        <Layout.Row type="flex">
          <Layout.Col span="24">
            <Table data={this.state.rows} columns={this.state.columns} border emptyText="No Data" maxHeight={this.state.maxHeight} 
            onHeaderDragEnd={this.headerDragEnd}
            />
          </Layout.Col>
        </Layout.Row>
      </div>
    );
  }

  headerDragEnd = (newW, oldW, column, event) => {
    let colDef = this.colDefs.find((cd) => {
      return cd.label === column.label
    })
    if (colDef) {
      colDef.width = newW
      colDef.minWidth = newW
    }
  }

  renderCrud() {
    return (
      <div >
        <Layout.Row>
            Executions <Tag type="gray" size="mini">{this.state.result.executionCount}</Tag>&nbsp;
            Elapsed <Tag type="gray" size="mini">{this.state.result.executionTime}</Tag>&nbsp;
            Rows Affected <Tag type="gray" size="mini">{this.state.result.updateCount}</Tag>&nbsp;
            Status <Tag type="gray" size="mini">{this.state.result.status}</Tag>&nbsp;
        </Layout.Row>
        <Layout.Row>
          <Button.Group>
            <Button size="mini" disabled={!this.inTransaction()} onClick={this.commit}>Commit</Button>
            <Button size="mini" disabled={!this.inTransaction()} onClick={this.rollback}>Rollback</Button>
          </Button.Group>
        </Layout.Row>
        <Layout.Row>
          <pre>{this.state.statement.sql}</pre>
        </Layout.Row>
      </div>
    );
  }

  render() {
    if (!this.state.result) {
      return this.renderExecuting()
    }
    if (this.state.result.error) {
      return this.renderError()
    }
    if (this.state.result.status === 'executing') {
      return this.renderExecuting()
    }
    if (this.state.result.type === 'query') {
      return this.renderQuery()
    }
    if (this.state.result.type === 'crud') {
      return this.renderCrud()
    }
    return this.renderExecuting()
  }
}

