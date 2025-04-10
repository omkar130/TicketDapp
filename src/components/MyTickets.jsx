import React, { useState, useEffect, useContext } from 'react';
import { Card, Button, Container, Row, Col, Form, Alert } from 'react-bootstrap';
import { Web3Context } from '../context/Web3Context';
import Web3 from 'web3';

const MyTickets = () => {
    const { contract, account, web3 } = useContext(Web3Context);
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [listingPrice, setListingPrice] = useState({});
    const [actionLoading, setActionLoading] = useState({});

    const fetchTickets = async () => {
        try {
            const balance = await contract.methods.balanceOf(account).call();
            const ticketsData = await Promise.all(
                Array.from({ length: parseInt(balance) }, async (_, i) => {
                    const tokenId = await contract.methods.tokenOfOwnerByIndex(account, i).call();
                    const eventId = await contract.methods.ticketToEvent(tokenId).call();
                    const event = await contract.methods.events(eventId).call();
                    const sale = await contract.methods.ticketSales(tokenId).call();

                    return {
                        tokenId,
                        eventId,
                        event,
                        sale,
                        formattedDate: new Date(parseInt(event.date) * 1000).toLocaleString()
                    };
                })
            );
            setTickets(ticketsData);
        } catch (error) {
            setError('Failed to load tickets');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTickets();
    }, [contract, account]);

    const listTicket = async (tokenId) => {
        setActionLoading(prev => ({ ...prev, [tokenId]: true }));
        try {
            const priceInWei = Web3.utils.toWei(listingPrice[tokenId], 'ether');
            await contract.methods.listTicketForSale(tokenId, priceInWei)
                .send({ from: account });
            await fetchTickets();
        } catch (error) {
            setError('Failed to list ticket');
            console.error(error);
        } finally {
            setActionLoading(prev => ({ ...prev, [tokenId]: false }));
        }
    };

    const delistTicket = async (tokenId) => {
        setActionLoading(prev => ({ ...prev, [tokenId]: true }));
        try {
            await contract.methods.delistTicket(tokenId)
                .send({ from: account });
            await fetchTickets();
        } catch (error) {
            setError('Failed to delist ticket');
            console.error(error);
        } finally {
            setActionLoading(prev => ({ ...prev, [tokenId]: false }));
        }
    };

    if (loading) return <div className="text-center mt-5">Loading tickets...</div>;

    return (
        <Container className="mt-4">
            <h2 className="mb-4">My Tickets</h2>
            {error && <Alert variant="danger">{error}</Alert>}

            {tickets.length === 0 ? (
                <Alert variant="info">You don't have any tickets yet.</Alert>
            ) : (
                <Row xs={1} md={2} lg={3} className="g-4">
                    {tickets.map(ticket => (
                        <Col key={ticket.tokenId}>
                            <Card>
                                <Card.Body>
                                    <Card.Title>{ticket.event.name}</Card.Title>
                                    <Card.Text>
                                        <strong>Ticket ID:</strong> #{ticket.tokenId}<br />
                                        <strong>Venue:</strong> {ticket.event.venue}<br />
                                        <strong>Date:</strong> {ticket.formattedDate}<br />
                                        {ticket.sale.isListed && (
                                            <strong>Listed Price: {Web3.utils.fromWei(ticket.sale.price, 'ether')} ETH</strong>
                                        )}
                                    </Card.Text>

                                    {!ticket.sale.isListed ? (
                                        <Form.Group className="mb-3">
                                            <Form.Control
                                                type="number"
                                                step="0.001"
                                                placeholder="Price in ETH"
                                                value={listingPrice[ticket.tokenId] || ''}
                                                onChange={(e) => setListingPrice({
                                                    ...listingPrice,
                                                    [ticket.tokenId]: e.target.value
                                                })}
                                            />
                                            <Button
                                                variant="primary"
                                                className="mt-2"
                                                disabled={actionLoading[ticket.tokenId]}
                                                onClick={() => listTicket(ticket.tokenId)}
                                            >
                                                {actionLoading[ticket.tokenId] ? 'Listing...' : 'List for Sale'}
                                            </Button>
                                        </Form.Group>
                                    ) : (
                                        <Button
                                            variant="danger"
                                            disabled={actionLoading[ticket.tokenId]}
                                            onClick={() => delistTicket(ticket.tokenId)}
                                        >
                                            {actionLoading[ticket.tokenId] ? 'Delisting...' : 'Delist Ticket'}
                                        </Button>
                                    )}
                                </Card.Body>
                            </Card>
                        </Col>
                    ))}
                </Row>
            )}
        </Container>
    );
};

export default MyTickets; 