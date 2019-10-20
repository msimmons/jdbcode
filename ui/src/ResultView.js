import React from 'react';
import { BaseView } from './BaseView'
import {Chip, Paper} from '@material-ui/core'
import {Grid as MUIGrid} from '@material-ui/core'
import RefreshIcon from '@material-ui/icons/Refresh'
import SaveIcon from '@material-ui/icons/Save'
import SaveAllIcon from '@material-ui/icons/SaveAlt'
import CachedIcon from '@material-ui/icons/Cached'
import RollbackIcon from '@material-ui/icons/Undo'
import CommitIcon from '@material-ui/icons/Check'
import { Grid, VirtualTable, TableHeaderRow, TableColumnResizing } from '@devexpress/dx-react-grid-material-ui'

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
  widths: [],
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

  noRows = () => {
    return this.state.rows.length===0
  }

  noMore = () => {
    return this.noRows() || !this.state.result.moreRows
  }

  moreRowsString = () => {
    return this.state.result.moreRows ? 'true' : 'false'
  }

  executionsString = () => {
    return `${this.state.result.executionCount} (${this.state.result.executionTime}ms)`
  }

  update = (event) => {
    // Only map the columns once, they won't change
    let widths = this.state.widths
    if (!this.colDefs || this.colDefs.length === 0) {
      let totalLen = 0
      this.colDefs = event.data.result.columns.map((column, ndx) => {
        totalLen += column.length
        //return {label: column, prop: column, columnKey: ndx, render: this.renderCell, renderHeader: this.renderHeader }
        return {name: column, title: column}
      })
      this.colDefs.forEach((column) => {
        let relativeWidth = Math.floor((((column.title.length+5)*this.colDefs.length)/totalLen)*100)
        column.minWidth = relativeWidth
        column.width = relativeWidth
        widths.push({columnName: column.name, width: relativeWidth})
      })
    }
    let rows = event.data.result.rows.map((row) => {
      let rowObject = {}
      this.colDefs.forEach((column, ndx) => {
        rowObject[column.name] = row[ndx]
        rowObject['id'] = ndx
      })
      return rowObject
    })
    this.setState({statement: event.data.statement, result: event.data.result, rows: rows, columns: this.colDefs, maxHeight: this.state.maxHeight, widths: widths})
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

  renderQuery() {
    const Root = props => <Grid.Root {...props} style={{ height: '100%' }} />
    const chipStyle = { 'margin-right': '10px' }
    return (
      <div>
        <MUIGrid>
            Executions <Chip variant="outlined" size="small" clickable label={this.executionsString()} title="Re-execute" icon={<RefreshIcon/>} style={chipStyle} onClick={this.reexecute}/>
            Rows <Chip variant="outlined" size="small" clickable label={this.state.rows.length} title="Export" icon={<SaveAllIcon/>} style={chipStyle} disabled={this.noRows()} onClick={this.export}/>
            More? <Chip variant="outlined" size="small" clickable label={this.moreRowsString()} title="Fetch More" icon={<CachedIcon/>} style={chipStyle} disabled={this.noMore()} onClick={this.fetch}/>
            Export All <Chip variant="outlined" size="small" clickable label="" title="Export All" icon={<SaveIcon/>} style={chipStyle} disabled={this.noMore()} onClick={this.exportAll}/>
        </MUIGrid>
        <Paper style={{ height: this.state.maxHeight }}>
          <Grid rows={this.state.rows} columns = {this.state.columns} rootComponent={Root}>
            <VirtualTable height="auto"/>
            <TableColumnResizing defaultColumnWidths = {this.state.widths.slice()} onColumnWidthsChange={this.columnWidthsChanged}/>
            <TableHeaderRow />
          </Grid>
        </Paper>
      </div>
    );
  }

  /** 
   * Handle when column widths change by setting the new widths in the state
  */
  columnWidthsChanged = (newWidths) => {
    this.state.widths = newWidths
  }

  renderCrud() {
    const chipStyle = { 'margin-right': '10px' }
    return (
      <div >
        <MUIGrid>
            Executed <Chip variant="outlined" size="small" label={this.executionsString()} style={chipStyle}/>
            Rows Affected <Chip variant="outlined" size="small" label={this.state.result.updateCount} style={chipStyle}/>
            <Chip variant="outlined" size="small" clickable label="Commit" title="Commit" icon={<CommitIcon color="primary"/>} style={chipStyle} disabled={!this.inTransaction()} onClick={this.commit}/>
            <Chip variant="outlined" size="small" clickable label="Rollback" title="Rollback" icon={<RollbackIcon color="error"/>} style={chipStyle} disabled={!this.inTransaction()} onClick={this.rollback}/>
            Status <Chip variant="outlined" size="small" label={this.state.result.status} style={chipStyle}/>
        </MUIGrid>
        <pre>{this.state.statement.sql}</pre>
      </div>
    );
  }

  render() {
    if (!this.state.result) {
      return this.renderExecuting(this.state.statement.sql, this.cancel)
    }
    if (this.state.result.error) {
      return this.renderError(this.state.result.error, this.state.statement.sql)
    }
    if (this.state.result.status === 'executing') {
      return this.renderExecuting(this.state.statement.sql, this.cancel)
    }
    if (this.state.result.type === 'query') {
      return this.renderQuery()
    }
    if (this.state.result.type === 'crud') {
      return this.renderCrud()
    }
    return this.renderExecuting(this.state.statement.sql, this.cancel)
  }
}

