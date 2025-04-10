import React, { useState, useContext } from 'react';
import { Form, Button, Card, Container, Alert } from 'react-bootstrap';
import { Web3Context } from '../context/Web3Context';
import { useNavigate } from 'react-router-dom';
import Web3 from 'web3';

const CreateEvent = () => {
    const { contract, account, isOwner } = useContext(Web3Context);
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '',
        date: '',
        venue: '',
        ticketPrice: '',
        totalTickets: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Get current date and time in the format required for datetime-local input
    const getCurrentDateTime = () => {
        const now = new Date();
        // Add 1 hour to current time to give some buffer
        now.setHours(now.getHours() + 1);
        // Format to YYYY-MM-DDThh:mm
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    // Validate the selected date is in the future
    const isDateValid = (selectedDate) => {
        const now = new Date();
        const selected = new Date(selectedDate);
        return selected > now;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // Additional date validation before submission
            if (!isDateValid(formData.date)) {
                throw new Error('Event date must be in the future');
            }

            const timestamp = Math.floor(new Date(formData.date).getTime() / 1000);
            const priceInWei = Web3.utils.toWei(formData.ticketPrice, 'ether');

            await contract.methods.createEvent(
                formData.name,
                timestamp,
                formData.venue,
                priceInWei,
                parseInt(formData.totalTickets)
            ).send({ from: account });

            navigate('/events');
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOwner) {
        return (
            <Container className="mt-4">
                <Alert variant="danger">
                    Only the owner can access this page.
                </Alert>
            </Container>
        );
    }

    return (
        <Container className="mt-4">
            <Card>
                <Card.Header>
                    <h4>Create New Event</h4>
                </Card.Header>
                <Card.Body>
                    <Form onSubmit={handleSubmit}>
                        <Form.Group className="mb-3">
                            <Form.Label>Event Name</Form.Label>
                            <Form.Control
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                                placeholder="Enter event name"
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Date and Time</Form.Label>
                            <Form.Control
                                type="datetime-local"
                                value={formData.date}
                                onChange={(e) => {
                                    const selectedDate = e.target.value;
                                    if (isDateValid(selectedDate)) {
                                        setFormData({ ...formData, date: selectedDate });
                                        setError('');
                                    } else {
                                        setError('Please select a future date and time');
                                    }
                                }}
                                min={getCurrentDateTime()} // This prevents selecting past dates
                                required
                            />
                            <Form.Text className="text-muted">
                                Event date and time must be in the future
                            </Form.Text>
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Venue</Form.Label>
                            <Form.Control
                                type="text"
                                value={formData.venue}
                                onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                                required
                                placeholder="Enter venue location"
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Ticket Price (ETH)</Form.Label>
                            <Form.Control
                                type="number"
                                step="0.001"
                                min="0"
                                value={formData.ticketPrice}
                                onChange={(e) => setFormData({ ...formData, ticketPrice: e.target.value })}
                                required
                                placeholder="Enter ticket price in ETH"
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Total Tickets</Form.Label>
                            <Form.Control
                                type="number"
                                min="1"
                                value={formData.totalTickets}
                                onChange={(e) => setFormData({ ...formData, totalTickets: e.target.value })}
                                required
                                placeholder="Enter total number of tickets"
                            />
                        </Form.Group>

                        {error && <Alert variant="danger">{error}</Alert>}

                        <Button
                            variant="primary"
                            type="submit"
                            disabled={loading || error}
                        >
                            {loading ? 'Creating...' : 'Create Event'}
                        </Button>
                    </Form>
                </Card.Body>
            </Card>
        </Container>
    );
};

export default CreateEvent; 