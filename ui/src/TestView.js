import React, { Component } from 'react';
import { Table, Button, Input, Layout, Tag, Alert, Icon } from 'element-react'

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
  rows: [],
  maxHeight: 100
}

export class TestView extends Component {

  vscode = undefined
  sqlStatement = undefined
  sqlResult = undefined
  columns = undefined

  constructor(props) {
    super(props) 
    this.state = initialState
    /*global acquireVsCodeApi vscode:true*/
    this.vscode = (typeof acquireVsCodeApi === 'function') ? acquireVsCodeApi() : undefined
    window.addEventListener('message', (event) => {
      this.update(event)
    })
    let totalLen = 0
    testColumns.forEach((column) => {
      totalLen += column.label.length
    })
    testColumns.forEach((column) => {
      let relativeLen = Math.floor((column.label.length*testColumns.length*2/totalLen)*100)
      column.minWidth = relativeLen
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
    this.setState({...this.state, maxHeight: height})
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

  renderTable() {
    return (
      <div>
            <Table 
            data={testData} 
            columns={testColumns} 
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

