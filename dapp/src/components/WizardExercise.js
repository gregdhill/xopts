import React, { Component } from "react";
import { Col, ListGroup, ListGroupItem, Container, Row, Form, Button, Modal, FormGroup } from "react-bootstrap";
import { ethers } from 'ethers';
import QRCode from "react-qr-code";
import * as utils from '../utils/utils.js';
import { showSuccessToast, showFailureToast } from '../controllers/toast';
import { withRouter } from 'react-router-dom';

class SelectSeller extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            loaded: false,
            sellers: [],
            options: [],
        };
    }

    async componentDidMount() {
        if (this.props.contract && this.props.contracts && !this.state.loaded) {
            // load the option contract selected by the user
            let optionContract = this.props.contracts.attachOption(this.props.contract);
            // get the seller and options denoted in a amountBtc of satoshi from a single option contract
            let [sellers, options] = await optionContract.getOptionOwnersFor(this.props.address);
            console.log(options);
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
            // convert the satoshi amountBtc into a BTC amount
            let amountBtc = utils.satToBtc(utils.newBig(this.state.options[index].toString()));
            let addressShow = address.substr(0, 10) + '...';

            return (
                <option key={address} value={address} onClick={() => this.props.updateAmount(amountBtc)}>{amountBtc.toString()} BTC (Seller: {addressShow})</option>
            );
        })
    }

    render() {
        if (this.props.currentStep !== 1) { // Prop: The current step
            return null
        }
        return (
            <FormGroup>
                <h5>Please select your position.</h5>
                <Form.Control as="select" name="seller" defaultValue="default" onChange={this.props.handleChange}>
                    <option disabled value="default"> -- Select -- </option>
                    {this.renderOptions()}
                </Form.Control>
                <br></br>
                <p>
                    If you have purchased the same option from multiple sellers, you need to select a seller from the list.
                    <i> We currently only support exercising one position at a time.</i>
                </p>
            </FormGroup>
        )
    }
}

class ScanBTC extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            loaded: false,
            paymentUri: ''
        };
    }

    async componentDidUpdate() {
        if (this.props.contract && this.props.contracts && this.props.seller && !this.state.loaded) {
            // get all the info from the selected contract to store this into storage
            let optionContract = this.props.contracts.attachOption(this.props.contract);
            let btcAddressRaw = await optionContract.getBtcAddress(this.props.seller);
            let [expiry, premium, strikePrice, totalSupply, totalSupplyLocked, totalSupplyUnlocked] = await optionContract.getDetails();

            // strike price is denoted in weiDai per satoshi
            let amountBtcInSat = utils.btcToSat(this.props.amountBtc);
            let amountOptions = utils.newBig(amountBtcInSat || 0).mul(strikePrice);
            // exchange rate between option and dai is 1:1
            let amountDai = amountOptions;

            let btcAddress = ethers.utils.toUtf8String(ethers.utils.hexlify(btcAddressRaw));

            let paymentUri = "bitcoin:" + btcAddress + "?amount=" + this.props.amountBtc;

            this.setState({
                loaded: true,
                paymentUri: paymentUri,
                recipient: btcAddress,
                option: this.props.contract,
                expiry: expiry,
                premium: premium,
                strikePrice: strikePrice,
                amountOptions: amountOptions,
                amountDai: amountDai
            });
        }
    }

    render() {
        if (this.props.currentStep !== 2) {
            return null
        }
        return (
            <FormGroup>
              <h5>Payment</h5>
                  <Row className="justify-content-md-center">
                    <Col md="auto" className="text-center">
                        <p>To exercise the option, please make the following Bitcoin payment with a wallet of your choice.</p>
                        <QRCode value={this.state.paymentUri} />
                    </Col>
                </Row>
              <h5>Summary</h5>
                <FormGroup>
                    <ListGroup>
                      <ListGroupItem>Amount BTC: <strong>{this.props.amountBtc.toString()} BTC</strong></ListGroupItem>
                      <ListGroupItem>BTC Address: <strong>{this.state.recipient}</strong></ListGroupItem>
                      <ListGroupItem>DAI to receive: <strong>{utils.weiDaiToDai(this.state.amountOptions).toString()} DAI</strong></ListGroupItem>
                    </ListGroup>
                </FormGroup>
            </FormGroup>
        )
    }
}

class SubmitProof extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            progress: 0
        }
    }

    componentDidMount() {
        let proofCountdown = setInterval(() => {
            this.setState({
                progress: this.state.progress + 10
            })
            if (this.state.progress >= 100) clearInterval(proofCountdown);
        }, 1000);
    }

    componentDidUpdate() {
        if (this.state.progress >= 100) {

        }
    }

    render() {
        if (this.props.currentStep !== 3) {
            return null
        }
        return (
            <div>
                <h4>Please enter the transaction id of your Bitcoin payment.</h4>
                <p>We will track it for you and tell you when it is ready!</p>
                <Form.Group>
                    <Form.Label>Transaction ID</Form.Label>
                    <Form.Control required name="txid" type="text" onChange={this.props.handleChange} />
                </Form.Group>
                <button type="submit" className="btn btn-success btn-block">Exercise</button>
            </div>
        )
    }
}

/*
<FormGroup>
    <h5>Alternatively, you can submit the proof yourself:</h5>
    <Form.Group>
        <Form.Label>BlockHeight</Form.Label>
        <Form.Control name="height" type="number" onChange={this.props.handleChange} />
    </Form.Group>
    <Form.Group>
        <Form.Label>Transaction Index</Form.Label>
        <Form.Control name="index" type="text" onChange={this.props.handleChange} />
    </Form.Group>
    <Form.Group>
        <Form.Label>Transaction ID</Form.Label>
        <Form.Control name="txid" type="text" onChange={this.props.handleChange} />
    </Form.Group>
    <Form.Group>
        <Form.Label>Proof</Form.Label>
        <Form.Control name="proof" type="text" onChange={this.props.handleChange} />
    </Form.Group>
    <Form.Group>
        <Form.Label>Raw Tx</Form.Label>
        <Form.Control name="rawtx" type="text" onChange={this.props.handleChange} />
    </Form.Group>
    <button disabled={this.state.progress < 100} className="btn btn-success btn-block">Exercise</button>
</FormGroup>
*/

class ExerciseWizard extends Component {

    constructor(props) {
        super(props);
        this.state = {
            currentStep: 1,
            seller: "",
            amountBtc: 0,
            recipient: "",
            option: "",
            expiry: 0,
            premium: 0,
            strikePrice: 0,
            txid: "",
            confirmations: 0,
            amountOptions: 0,
            amountDai: 0,
        };

        this.handleChange = this.handleChange.bind(this)
        this.updateAmount = this.updateAmount.bind(this)
    }

    handleChange(event) {
        const { name, value } = event.target;
        this.setState({
            [name]: value
        });
    }

    updateAmount(i) {
        this.setState({
            amountBtc: i
        });
    }

    isValid(step) {
        if (step == 0 && this.state.seller == "") {
            return false;
        }
        return true;
    }

    handleSubmit = async (event) => {
        event.preventDefault();
        let currentStep = this.state.currentStep;
        if (currentStep <= 2) {
            if (!this.isValid(currentStep-1)) return;
            this.setState({currentStep: currentStep + 1});
            return;
        }
        // store txid to local storage
        // store a mapping of the option to the txid
        const { seller, amountBtc, txid } = this.state;
        try {
            this.props.storage.setPendingOptions(amountBtc, seller, this.props.contract, txid, 0);
            showSuccessToast(this.props.toast, 'Awaiting verification!', 3000);
            this.props.hide();
            this.forceUpdate();
            this.props.reloadPurchased();
        } catch (error) {
            console.log(error);
            showFailureToast(this.props.toast, 'Failed to send transaction...', 3000);
        }
    }

    _next() {
        let currentStep = this.state.currentStep;
        if (!this.isValid(currentStep-1)) return;
        // If the current step is 1 or 2, then add one on "next" button click
        currentStep = currentStep >= 2 ? 3 : currentStep + 1;
        this.setState({
            currentStep: currentStep
        })
    }

    _prev() {
        let currentStep = this.state.currentStep
        // If the current step is 2 or 3, then subtract one on "previous" button click
        currentStep = currentStep <= 1 ? 1 : currentStep - 1
        this.setState({
            currentStep: currentStep
        })
    }

    get previousButton() {
        let currentStep = this.state.currentStep;
        if (currentStep !== 1) {
            return (
                <button
                    className="btn btn-secondary float-left"
                    type="button" onClick={() => this._prev()}>
                    Previous
                </button>
            )
        }
        return null;
    }

    get nextButton() {
        let currentStep = this.state.currentStep;
        if (currentStep < 3) {
            return (
                <button
                    className="btn btn-primary float-right"
                    type="button" onClick={() => this._next()}>
                    Next
                </button>
            )
        }
        return null;
    }

    render() {
        return (
            <Container>
                <Modal.Header closeButton>
                    <Modal.Title id="contained-modal-title-vcenter">
                        Exercise Option
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form onSubmit={this.handleSubmit}>
                        <SelectSeller
                            currentStep={this.state.currentStep}
                            handleChange={this.handleChange}
                            seller={this.state.seller}
                            amountBtc={this.state.amountBtc}
                            updateAmount={this.updateAmount}
                            contract={this.props.contract}
                            contracts={this.props.contracts}
                            signer={this.props.signer}
                            address={this.props.address}
                        />
                        <ScanBTC
                            currentStep={this.state.currentStep}
                            handleChange={this.handleChange}
                            updateAmount={this.updateAmount}
                            contract={this.props.contract}
                            contracts={this.props.contracts}
                            signer={this.props.signer}
                            seller={this.state.seller}
                            amountBtc={this.state.amountBtc}
                        />
                        <SubmitProof
                            currentStep={this.state.currentStep}
                            handleChange={this.handleChange}
                            seller={this.state.seller}
                        />
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    {this.previousButton}
                    {this.nextButton}
                    <Button variant="danger" onClick={() => this.props.hide()}>Cancel</Button>
                </Modal.Footer>
            </Container>
        )
    }
}

export default withRouter(ExerciseWizard);
