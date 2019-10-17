import React from 'react';
import { Badge, Card, CardContent, Chip, Paper, CardHeader, Typography } from '@material-ui/core'
import RefreshIcon from '@material-ui/icons/Refresh'
import SaveIcon from '@material-ui/icons/Save'
import SaveAllIcon from '@material-ui/icons/SaveAlt'
import CachedIcon from '@material-ui/icons/Cached'
import ErrorIcon from '@material-ui/icons/Error'
import {Grid as MUIGrid} from '@material-ui/core'
import { FilteringState, IntegratedFiltering } from '@devexpress/dx-react-grid'
import { Grid, VirtualTable, TableHeaderRow, TableColumnResizing, TableFilterRow } from '@devexpress/dx-react-grid-material-ui'
import { BaseView } from './BaseView'
import { makeStyles } from '@material-ui/core/styles';

const initialState = {
  statement: {
    id: '123098',
    sql: "Select * from foo"
  },
  result: {
    columns: [],
    error: 'The text of the error, could be longish',
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

const useStyles = makeStyles(theme => ({
  root: {
    width: 'fit-content',
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
    backgroundColor: theme.palette.background.paper,
    color: theme.palette.text.secondary,
    '& svg': {
      margin: theme.spacing(2),
    },
    '& hr': {
      margin: theme.spacing(0, 0.5),
    },
  },
}));

export class TestView extends BaseView {

  vscode = undefined
  
  constructor(props) {
    super(props) 
    this.state = initialState
    /*global acquireVsCodeApi*/
    this.vscode = (typeof acquireVsCodeApi === 'function') ? acquireVsCodeApi() : undefined
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
    if (!this.columns || this.columns.length === 0) {
      this.columns = event.data.result.columns.map((column, ndx) => {
        return {label: column, prop: column, columnKey: ndx }
      })
    }
    let rows = event.data.result.rows.map((row) => {
      let rowObject = {}
      this.columns.forEach((column, ndx) => {
        rowObject[column.prop] = row[ndx]
      })
      return rowObject
    })
    this.setState({statement: event.data.statement, result: event.data.result, rows: rows, columns: this.columns, maxHeight: this.state.maxHeight})
  }

  generateColumns(numColumns) {
    let columns = []
    for (let i=0; i<numColumns; i++) {
      let label = 'Column'+i
      let prop = 'column'+i
      //columns.push({label: label, prop: prop, render: this.renderCell, renderHeader: this.renderHeader})
      columns.push({name: prop, title: label})
    }
    console.log(columns)
    return columns
  }

  generateColumnWidths(columns) {
    let widths = []
    columns.forEach((column, index) => {
      widths.push({columnName: column.name, width: column.title.length * 20})
    })
    return widths
  }

  generateRows(columns, numRows) {
    let rows = []
    for (let i=0; i<numRows; i++) {
      let rowObject = {}
      columns.forEach((column, ndx) => {
        rowObject[column.name] = 'Column'+ndx+' data row '+i
        rowObject['id'] = i
      })
      rows.push(rowObject)
    }
    return rows
  }

  renderTable() {
    const Root = props => <Grid.Root {...props} style={{ height: '100%' }} />
    const chipStyle = { 'margin-right': '10px' }
    const tableStyle = { 'border-right': '1px solid' }

    let generatedColumns = this.generateColumns(25)
    let generatedRows = this.generateRows(generatedColumns, 250)
    let widths = this.generateColumnWidths(generatedColumns)
    return (
      <div>
        <MUIGrid>
            Executions <Chip variant="outlined" size="small" clickable label="1 (20ms)" title="Re-execute" icon={<RefreshIcon/>} style={chipStyle}/>
            Rows <Chip variant="outlined" size="small" clickable label="30" title="Export" icon={<SaveAllIcon/>} style={chipStyle}/>
            More? <Chip variant="outlined" size="small" clickable label="true" clickable title="Fetch More" icon={<CachedIcon/>} style={chipStyle}/>
            Export All <Chip variant="outlined" size="small" clickable label="" clickable title="Export All" icon={<SaveIcon/>} style={chipStyle}/>
        </MUIGrid>
        <Paper style={{ height: '800px' }}>
          <Grid rows={generatedRows} columns = {generatedColumns} rootComponent={Root} >
            <FilteringState defaultFilters={[]} />
            <IntegratedFiltering />
            <VirtualTable height="auto" />
            <TableColumnResizing defaultColumnWidths = {widths}/>
            <TableHeaderRow />
            <TableFilterRow />
          </Grid>
        </Paper>
      </div>
    );
  }

  renderError() {
    return (
      <div>
        <Card elevation={4} style={{border: '1px solid red', 'margin': '10px'}}>
          <CardHeader title="Error" avatar={<ErrorIcon color="error"/>} />
          <CardContent>
            <Typography variant="h6" color="default" component="p">
              {this.state.result.error}
            </Typography>
          </CardContent>
        </Card>
        <Typography variant="body1" component="pre" style={{margin: '10px'}}>
          {this.state.statement.sql}
        </Typography>

        <Chip background="green" label={4} title="Hello" size="small" style={{background: "lavender"}}>
        </Chip>
      </div>
    )
  }

  render() {
    return this.renderError()
  }
}

