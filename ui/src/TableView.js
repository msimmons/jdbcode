import React from 'react';
import { BaseView } from './BaseView'
import {Chip, TableHead, TableRow, TableBody, TableCell, Table} from '@material-ui/core'
import StarIcon from '@material-ui/icons/StarBorder'

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

export class TableView extends BaseView {

  renderName = (row, column, index) => {
    return (
      <span>{row.name} {row.keySequence ? <StarIcon/> : ""}</span>
    )
  }

  renderIndices = (row, column, index) => {
    return row.indices.map((ndx) =>
      <span title={`${ndx.name} (${ndx.unique ? 'unique' : ''} ${ndx.direction})`}>
        <Chip label={ndx.position} style={this.tagStyle(ndx)}/>
      </span>
    )
  }

  tagStyle = (index) => {
    let ndx = this.state.table.indices.findIndex((name) => {
      return name === index.name
    })
    let color = ndx > tagColors.length-1 ? 'gray' : tagColors[ndx]
    return {background: `${color}`}
  }

  tagColor = (index) => {
    let ndx = this.state.table.indices.findIndex((name) => {
      return name === index.name
    })
    return ndx > tagColors.length-1 ? 'gray' : tagColors[ndx]
  }

  columns = [
    { label: 'Name', render: this.renderName },
    { label: 'Type', prop: 'type', renderHeader: this.renderHeader, render: this.renderCell },
    { label: 'Size', prop: 'size', renderHeader: this.renderHeader, render: this.renderCell },
    { label: 'Default', prop: 'default', renderHeader: this.renderHeader, render: this.renderCell },
    { label: 'Null?', prop: 'nullable', renderHeader: this.renderHeader, render: this.renderCell },
    { label: 'Auto?', prop: 'autoincrement', renderHeader: this.renderHeader, render: this.renderCell },
    { label: 'References', prop: 'references', renderHeader: this.renderHeader, render: this.renderCell },
    { label: 'Indices', render: this.renderIndices }
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
    let table = event.data.object.object
    if (!table) {
      return
    }
    let rows = table.columns
    this.setState({ ...this.state, table: table, rows: rows, status: event.data.status, error: event.data.error})
  }

  cancel = () => {
    console.log('Canceling')
  }

  renderTable() {
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
      return this.renderError(this.state.error, this.state.table.name)
    }
    if (this.state.status === 'executing') {
      return this.renderExecuting('Describing table', this.cancel)
    }
    else {
      return this.renderTable()
    }
  }
}
