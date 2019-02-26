import React, { Component } from 'react';
import { Table, Button, Alert, Icon, Tag } from 'element-react'

const initialState = {
  status: 'executing',
  table: undefined,
  rows: [],
  maxHeight: 100,
  error: undefined
}

const tagColors = [
  'lavender', 
  'thistle', 
  'plum', 
  'violet', 
  'orchid', 
  'powderblue', 
  'lightblue', 
  'lightskyblue', 
  'deepskyblue', 
  'lightsteelblue',
  'lightcyan',
  'cyan',
  'aquamarine',
  'turquoise'
]

export class TableView extends Component {

  renderName = (row, column, index) => {
    return (
      <span>{row.name} {row.keySequence ? <Icon name="star-off"/> : ""}</span>
    )
  }

  renderIndices = (row, column, index) => {
    return row.indices.map((ndx) =>
      <span title={`${ndx.name} (${ndx.unique ? 'unique' : ''} ${ndx.direction})`}>
        <Tag color={this.tagColor(ndx)} >{ndx.position}</Tag>
      </span>
    )
  }

  tagColor = (index) => {
    let ndx = this.state.table.indices.findIndex((name) => {
      return name === index.name
    })
    return ndx > tagColors.length-1 ? 'gray' : tagColors[ndx]
  }

  columns = [
    { label: 'Name', render: this.renderName },
    { label: 'Type', prop: 'type' },
    { label: 'Size', prop: 'size' },
    { label: 'Default', prop: 'default' },
    { label: 'Null?', prop: 'nullable' },
    { label: 'Auto?', prop: 'autoincrement' },
    { label: 'References', prop: 'references' },
    { label: 'Indices', render: this.renderIndices }
  ]

  constructor(props) {
    super(props)
    this.setState(initialState)
    /*global acquireVsCodeApi */
    this.vscode = (typeof acquireVsCodeApi === 'function') ? acquireVsCodeApi() : undefined
    window.addEventListener('message', (event) => {
      this.update(event)
    })
  }

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
    this.setState({ ...this.state, maxHeight: height })
  }

  update = (event) => {
    let table = event.data.object.resolved
    if (!table) {
      return
    }
    console.log(table)
    let rows = table.columns
    this.setState({ ...this.state, table: table, rows: rows, status: event.data.status, error: event.data.error})
  }

  cancel = () => {
    console.log('Canceling')
  }

  renderError() {
    return (
      <div>
        <Alert showIcon type="error" title={this.state.table.name} description={this.state.error} closable={false} />
      </div>
    )
  }

  renderExecuting() {
    return (
      <div>
        <Button size="mini" onClick={this.cancel}>Cancel</Button>
        <div><Icon name="loading" /></div>
        <div>
          <span>Describing {this.state.tableName}</span>
        </div>
      </div>
    )
  }

  renderTable() {
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
      return this.renderTable()
    }
  }
}
