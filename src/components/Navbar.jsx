import React, { useContext } from 'react';
import { Navbar, Container, Button, Alert, Badge, Nav } from 'react-bootstrap';
import { Web3Context } from '../context/Web3Context';
import { Link } from 'react-router-dom';

const NavigationBar = () => {
    const {
        account,
        isConnected,
        isCorrectNetwork,
        isLoading,
        isOwner,
        connectWallet,
        checkAndSwitchNetwork
    } = useContext(Web3Context);

    if (isLoading) {
        return (
            <Navbar bg="dark" variant="dark" expand="lg" className="py-3">
                <Container>
                    <Navbar.Brand>Ticket DApp</Navbar.Brand>
                    <span className="text-light">Loading...</span>
                </Container>
            </Navbar>
        );
    }

    return (
        <>
            <Navbar bg="dark" variant="dark" expand="lg" className="py-3">
                <Container>
                    <Navbar.Brand as={Link} to="/">Ticket DApp</Navbar.Brand>
                    <Navbar.Toggle />
                    <Navbar.Collapse className="justify-content-end">
                        {isConnected && isCorrectNetwork && (
                            <Nav className="me-auto">
                                <Nav.Link as={Link} to="/events">Events</Nav.Link>
                                <Nav.Link as={Link} to="/my-tickets">My Tickets</Nav.Link>
                                <Nav.Link as={Link} to="/marketplace">Marketplace</Nav.Link>
                                <Nav.Link as={Link} to="/activity">Activity</Nav.Link>
                                {isOwner && (
                                    <Nav.Link as={Link} to="/create-event">Create Event</Nav.Link>
                                )}
                            </Nav>
                        )}
                        {!isConnected ? (
                            <Button variant="outline-light" onClick={connectWallet}>
                                Connect Wallet
                            </Button>
                        ) : (
                            <div className="d-flex align-items-center">
                                <span className="text-light me-3">
                                    {account.slice(0, 6)}...{account.slice(-4)}
                                    {isOwner && (
                                        <Badge bg="success" className="ms-2">Owner</Badge>
                                    )}
                                </span>
                                {!isCorrectNetwork && (
                                    <Button variant="warning" size="sm" onClick={checkAndSwitchNetwork}>
                                        Switch to Sepolia
                                    </Button>
                                )}
                            </div>
                        )}
                    </Navbar.Collapse>
                </Container>
            </Navbar>

            {!isCorrectNetwork && isConnected && (
                <Alert
                    variant="warning"
                    className="m-0"
                >
                    Please switch to Sepolia network to use this application.
                </Alert>
            )}
        </>
    );
};

export default NavigationBar; 