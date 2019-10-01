import React from 'react';
import { Table, Button } from 'element-react'
import { BaseView } from './BaseView'

const testColumns = [
  {
    label: "Date",
    prop: "date",
    align: 'center',
    minWidth: 100
  },
  {
    label: "Name",
    prop: "name",
    minWidth: 100
  },
  {
    label: "State",
    prop: "state",
    minWidth: 120
  },
  {
    label: "City",
    prop: "city",
    minWidth: 100
  },
  {
    label: "Address",
    prop: "address",
    minWidth: 170
  },
  {
    label: "Zip",
    prop: "zip",
    minWidth: 70
  },
  {
    label: "Operations",
    minWidth: 250,
    render: (row, column, index)=>{
      return <span><Button type="text" size="small" >Remove</Button></span>
    }
  }
]

const testData = [{
  date: '2016-05-03',
  name: 'Tom',
  state: 'California',
  city: 'Los Angeles',
  address: 'No. 189, Grove St, Los Angeles',
  zip: 'CA 90036'
}, {
  date: '2016-05-02',
  name: 'Tom',
  state: 'California',
  city: 'Los Angeles',
  address: 'No. 189, Grove St, Los Angeles',
  zip: 'CA 90036'
}, {
  date: '2016-05-04',
  name: 'Tom',
  state: 'California',
  city: 'Los Angeles',
  address: 'No. 189, Grove St, Los Angeles',
  zip: 'CA 90036'
}, {
  date: '2016-05-01',
  name: 'Tom',
  state: 'California',
  city: 'Los Angeles',
  address: 'No. 189, Grove St, Los Angeles',
  zip: 'CA 90036'
}, {
  date: '2016-05-08',
  name: 'Tom',
  state: 'California',
  city: 'Los Angeles',
  address: 'No. 189, Grove St, Los Angeles',
  zip: 'CA 90036'
}, {
  date: '2016-05-06',
  name: 'Tom',
  state: 'California',
  city: 'Los Angeles',
  address: 'No. 189, Grove St, Los Angeles',
  zip: 'CA 90036'
}, {
  date: '2016-05-07',
  name: 'Tom',
  state: 'California',
  city: 'Los Angeles',
  address: 'No. 189, Grove St, Los Angeles',
  zip: 'CA 90036'
}]

const initialState = {
  statement: {
    id: '123098',
    sql: "Select * from foo"
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
  rows: testData,
  maxHeight: 100
}

export class TestView extends BaseView {

  vscode = undefined
  
  constructor(props) {
    super(props) 
    this.state = initialState
    /*global acquireVsCodeApi*/
    this.vscode = (typeof acquireVsCodeApi === 'function') ? acquireVsCodeApi() : undefined
    let totalLen = 0
    testColumns.forEach((column) => {
      totalLen += column.label.length
    })
    testColumns.forEach((column) => {
      let relativeLen = Math.floor(((column.label.length)*testColumns.length/totalLen)*100)
      column.minWidth = relativeLen
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
      columns.push({label: label, prop: prop, render: this.renderCell, renderHeader: this.renderHeader})
    }
    console.log(columns)
    return columns
  }

  generateRows(columns, numRows) {
    let rows = []
    for (let i=0; i<numRows; i++) {
      let rowObject = {}
      columns.forEach((column, ndx) => {
        rowObject[column.prop] = 'Column'+ndx+' data row '+i
      })
      rows.push(rowObject)
    }
    return rows
  }

  renderTable() {
    let generatedColumns = this.generateColumns(50)
    let generatedRows = this.generateRows(generatedColumns, 500)
    return (
      <div>
            <Table 
            data={generatedRows} 
            columns={generatedColumns} 
            border 
            emptyText="No Data" 
            maxHeight={this.state.maxHeight} 
            />
      </div>
    );
  }

  render() {
    return this.renderTable()
  }
}

