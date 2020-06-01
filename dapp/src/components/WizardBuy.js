import React from "react";
import { Container, ListGroup, ListGroupItem, Form, FormGroup, FormControl, Modal } from "react-bootstrap";
import * as utils from '../utils/utils.js'; 
import { showSuccessToast, showFailureToast } from '../controllers/toast';
import { SpinButton } from './SpinButton';
import { withRouter } from 'react-router-dom'

class SelectSeller extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loaded: false,
      sellers: [],
      options: [],
    };
  }

  async componentDidUpdate() {
    if (this.props.optionContract && !this.state.loaded) {
      let [sellers, options] = await this.props.optionContract.getOptionSellers();
      this.setState({
        loaded: true,
        sellers: sellers,
        options: options,
      });
    }
  }

  renderOptions() {
    return this.state.sellers.map((seller, index) => {
      let address = seller.toString();
      // one option == one dai wei
      let amount = utils.weiDaiToDai(utils.newBig(this.state.options[index].toString()));
      let amountBtc = amount.div(this.props.strikePrice);
      let addressShow = address.substr(0,10) + '...';
      console.log(this.state.options[index].toString());
      return (
        <option key={address} value={address} onClick={() => this.props.updateAmountOptions(amount)}> {amountBtc.toString()} BTC (Seller: {addressShow})</option>
      );
    })
  }

  render() {
    if (this.props.currentStep !== 1) { // Prop: The current step
      return null
    }
    return(
      <FormGroup>
        <h5>Select Seller</h5>
        <Form.Control as="select" name="seller" defaultValue="default" onChange={this.props.handleChange}>
          <option disabled value="default"> -- Select -- </option>
          {this.renderOptions()}
        </Form.Control>
      </FormGroup>
    )
  }
}

class EnterAmount extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    if (this.props.currentStep !== 2) {
      return null
    }
    let amount = utils.calculateAvailableBTC(this.props.amountOptions, this.props.strikePrice).toString();
    return(
      <FormGroup>
        <h5>Enter BTC Amount</h5>
        <FormControl
          id="amountBTC"
          name="amountBTC"
          type="number"
          placeholder="Amount"
          max={amount}
          defaultValue={amount}
          onChange={this.props.handleChange}
        />
      </FormGroup>
    )
  }
}

class Confirm extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    if (this.props.currentStep !== 3) {
      return null
    }
    return(
      <FormGroup>
        <h5>Confirm & Pay</h5>
        <FormGroup>
          <ListGroup>
              <ListGroupItem>Strike Price: <strong>{this.props.strikePrice.toString()} DAI</strong></ListGroupItem>
              <ListGroupItem>Expiry: <strong>{new Date(this.props.expiry*1000).toLocaleString()}</strong></ListGroupItem>
              <ListGroupItem>Purchase Amount: <strong>{utils.calculateAvailableBTC(this.props.amountOptions, this.props.strikePrice).toString()} BTC</strong></ListGroupItem>
              <ListGroupItem>Premium: <strong>{utils.calculatePremium(utils.calculateAvailableBTC(this.props.amountOptions, this.props.strikePrice), this.props.premium).toString()} DAI</strong></ListGroupItem>
              <ListGroupItem>Options Received: <strong>{this.props.amountOptions.toString()} XOPT</strong></ListGroupItem>
              <ListGroupItem>Seller: <strong>{this.props.seller}</strong></ListGroupItem>
          </ListGroup>
        </FormGroup>
        <SpinButton spinner={this.props.spinner}/>
      </FormGroup>
    )
  }
}

class Buy extends React.Component {

  constructor(props) {
    super(props)
    this._next = this._next.bind(this)
    this._prev = this._prev.bind(this)
    this.state = {
      currentStep: 1,
      seller: '',
      amountOptions: utils.newBig(0),
      optionContract: null,
      expiry: 0,
      premium: utils.newBig(0),
      strikePrice: utils.newBig(0),
      spinner: false,
    }

    this.handleChange = this.handleChange.bind(this)
    this.updateAmountOptions = this.updateAmountOptions.bind(this)
  }

  async componentDidMount() {
    if (this.props.signer) {
      const contract = this.props.contract;

      let contracts = this.props.contracts;
      let optionContract = contracts.attachOption(contract);
      let [expiry, premium, strikePrice, totalSupply, totalSupplyLocked, totalSupplyUnlocked] = await optionContract.getDetails();

      this.setState({
        optionContract: optionContract,
        expiry: expiry,
        premium: utils.weiDaiToBtc(utils.newBig(premium.toString())),
        strikePrice: utils.weiDaiToBtc(utils.newBig(strikePrice.toString())),
      });
    }
  }

  // Use the submitted data to set the state
  handleChange(event) {
    let {name, value} = event.target
    if(name == "amountBTC"){
      this.setState({
        amountOptions: utils.newBig(value).mul(this.state.strikePrice)
      });
    } else {
      this.setState({
        [name]: value
      });
    }
  }

  updateAmountOptions(i) {
    this.setState({
      amountOptions: i,
    });
  }
  
  // Trigger an alert on form submission
  handleSubmit = async (event) => {
    event.preventDefault();
    this.setState({spinner: true});
    const { seller, amountOptions, optionContract, strikePrice } = this.state;
    try {
      let contracts = this.props.contracts;
      let satoshis = utils.btcToSat(utils.calculateAvailableBTC(amountOptions, strikePrice)).round(0, 0);
      await contracts.checkAllowance(satoshis);
      await contracts.insureOption(optionContract.address, seller, satoshis.toString());
      this.props.history.push("/dashboard")
      showSuccessToast(this.props.toast, 'Successfully purchased option!', 3000);
    } catch(error) {
      console.log(error);
      showFailureToast(this.props.toast, 'Failed to send transaction...', 3000);
    }
    this.setState({spinner: false});
  }

  _next() {
    let currentStep = this.state.currentStep
    // If the current step is 1 or 2, then add one on "next" button click
    currentStep = currentStep >= 2? 3: currentStep + 1
    this.setState({
      currentStep: currentStep
    })
  }
    
  _prev() {
    let currentStep = this.state.currentStep
    // If the current step is 2 or 3, then subtract one on "previous" button click
    currentStep = currentStep <= 1? 1: currentStep - 1
    this.setState({
      currentStep: currentStep
    })
  }

  get previousButton(){
    let currentStep = this.state.currentStep;
    // If the current step is not 1, then render the "previous" button
    if(currentStep!==1){
      return (
        <button 
          className="btn btn-secondary float-left" 
          type="button" onClick={this._prev}>
        Previous
        </button>
      )
    }
    // ...else return nothing
    return null;
  }
  
  get nextButton(){
    let currentStep = this.state.currentStep;
    // If the current step is not 3, then render the "next" button
    if(currentStep<3){
      return (
        <button 
          className="btn btn-primary float-right" 
          type="button" onClick={this._next}>
        Next
        </button>        
      )
    }
    // ...else render nothing
    return null;
  }
  
  render() {
    return (
      <Container>
        <Modal.Header closeButton>
          <Modal.Title id="contained-modal-title-vcenter">
              Buy Option
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={this.handleSubmit}>
            <SelectSeller 
              currentStep={this.state.currentStep} 
              handleChange={this.handleChange}
              updateAmountOptions={this.updateAmountOptions}
              seller={this.state.seller}
              strikePrice={this.state.strikePrice}
              optionContract={this.state.optionContract}
            />
            <EnterAmount 
              currentStep={this.state.currentStep} 
              handleChange={this.handleChange}
              amountOptions={this.state.amountOptions}
              strikePrice={this.state.strikePrice}
            />
            <Confirm
              currentStep={this.state.currentStep} 
              handleChange={this.handleChange}
              seller={this.state.seller}
              amountOptions={this.state.amountOptions}
              premium={this.state.premium}
              strikePrice={this.state.strikePrice}
              expiry={this.state.expiry}
              spinner={this.state.spinner}
            />
          </Form>
        </Modal.Body>
        <Modal.Footer>
          {this.previousButton}
          {this.nextButton}
        </Modal.Footer>
      </Container>
    )
  }
}

export default withRouter(Buy);