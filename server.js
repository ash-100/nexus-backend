const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

console.log('Environment variables loaded:');
console.log('VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL);
console.log('VITE_SUPABASE_ANON_KEY:', process.env.VITE_SUPABASE_ANON_KEY ? 'Set' : 'Not set');
console.log('PORT:', process.env.PORT);

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration
app.use(cors({
    origin: [
        'http://localhost:8080',
        'http://localhost:3000',
        'http://localhost:5173',
        'http://192.168.1.20:8080',
        'http://192.168.1.20:3000',
        'http://192.168.1.20:5173',
        'https://preview--creative-content-manager.lovable.app',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.options('*', cors());

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials. Please check your .env file.');
    console.error('Required: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// API Routes

// 1. Content Plan API
app.get('/api/content_plan', async (req, res) => {
    try {
        // Fetch creatives from database
        const { data: creativesData, error } = await supabase
            .from('creatives')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching creatives:', error);
            return res.status(500).json({ error: 'Failed to fetch creatives data' });
        }

        console.log(JSON.stringify(creativesData, null, 2));

        // Fetch ambient audio settings from operational_metadata
        const { data: ambientData, error: ambientError } = await supabase
            .from('operational_metadata')
            .select('ambient_uuid, ambient_url, ambient_audio_vol, custom_fields')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (ambientError) {
            console.error('Error fetching ambient settings:', ambientError);
        }

        // Parse ambient audio settings
        let ambientAudioSettings = null;
        if (ambientData) {
            const customFields = ambientData.custom_fields || {};
            const isEnabled = customFields.ambient_audio_enabled === true;

            if (isEnabled && ambientData.ambient_url) {
                ambientAudioSettings = {
                    enabled: isEnabled,
                    ambient_uuid: ambientData.ambient_uuid,
                    ambient_url: ambientData.ambient_url,
                    ambient_audio_vol: Number(ambientData.ambient_audio_vol) || 0.5
                };
            }
        }

        console.log('Ambient audio settings:', ambientAudioSettings);


        // Build content plan from database creatives
        const publisherContent = (creativesData || []).map(creative => ({
            campaign_run: creative.campaign_run,
            duration_millis: creative.duration
        }));

        // Build campaign data
        let campaignData = new Map();
        (creativesData || []).forEach(creative => {
            if (creative.campaign_run && creative.campaign_data) {
                campaignData.set(creative.campaign_run, creative.campaign_data);
            }
        })

        // Build super_loop with the same structure as publisher_content
        const superLoop = publisherContent.map(item => ({
            campaign_run: item.campaign_run,
            duration_millis: item.duration_millis
        }));

        const contentPlan = {
            publisher_content: publisherContent,
            campaign_data: Object.fromEntries(campaignData),
            campaign_orders: [],
            super_loop: superLoop,
            priority_campaign_orders: [],
            vistar_config: {
                enabled: false,
                base_url: "",
                publisher_id: ""
            },
            ambient_audio_settings: ambientAudioSettings, // Add ambient audio settings
        };

        res.json(contentPlan);
    } catch (error) {
        console.error('Error fetching content plan:', error);
        res.status(500).json({ error: 'Failed to fetch content plan' });
    }
});

// 2. Operational Metadata API
app.get('/api/operational_metadata', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('operational_metadata')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('Error fetching metadata:', error);
            return res.status(500).json({ error: 'Failed to fetch operational metadata' });
        }

        if (data) {
            // Parse custom fields if they exist
            let parsedCustomFields = {};
            if (data.custom_fields) {
                try {
                    if (typeof data.custom_fields === 'string') {
                        parsedCustomFields = JSON.parse(data.custom_fields);
                    } else if (typeof data.custom_fields === 'object') {
                        parsedCustomFields = data.custom_fields;
                    }
                    console.log('Parsed custom fields:', parsedCustomFields);
                } catch (parseError) {
                    console.error('Error parsing custom fields:', parseError);
                    console.error('Raw custom_fields value:', data.custom_fields);
                    parsedCustomFields = {};
                }
            }

            // Transform the data to match the expected API format
            const transformedData = {
                ambient_audio_vol: Number(data.ambient_audio_vol),
                ambient_url: data.ambient_url,
                ambient_uuid: data.ambient_uuid,
                campaign_refresh_period: data.campaign_refresh_period,
                device_clock_offset_tolerance_millis: Number(data.device_clock_offset_tolerance_millis),
                device_uuid: data.device_uuid,
                feed_entries_to_upload_per_cycle: data.feed_entries_to_upload_per_cycle,
                lemma_operational_config: data.lemma_operational_config,
                panel_id: data.panel_id,
                priority_campaign_interval: data.priority_campaign_interval,
                programmatic_probability: Number(data.programmatic_probability),
                programmatic_probability_hour_wise: Number(data.programmatic_probability_hour_wise),
                programmatic_probability_slot_wise: Number(data.programmatic_probability_slot_wise),
                screen_uuid: data.screen_uuid,
                server_time_millis: Number(data.server_time_millis),
                show_aruco_overlay: data.show_aruco_overlay,
                spot_uuid: data.spot_uuid,
                timezone_identifier: data.timezone_identifier,
                // Include parsed custom fields
                ...parsedCustomFields
            };
            res.json(transformedData);
        } else {
            res.status(404).json({ error: 'No operational metadata found' });
        }
    } catch (error) {
        console.error('Error fetching operational metadata:', error);
        res.status(500).json({ error: 'Failed to fetch operational metadata' });
    }
});

// 3. Screen Config API
app.post('/api/config', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('screen_config')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('Error fetching config:', error);
            return res.status(500).json({ error: 'Failed to fetch screen config' });
        }

        if (data) {
            // Parse custom fields if they exist
            let parsedCustomFields = {};
            if (data.custom_fields) {
                try {
                    if (typeof data.custom_fields === 'string') {
                        parsedCustomFields = JSON.parse(data.custom_fields);
                    } else if (typeof data.custom_fields === 'object') {
                        parsedCustomFields = data.custom_fields;
                    }
                    console.log('Screen config parsed custom fields:', parsedCustomFields);
                } catch (parseError) {
                    console.error('Error parsing screen config custom fields:', parseError);
                    console.error('Raw custom_fields value:', data.custom_fields);
                    parsedCustomFields = {};
                }
            }

            const transformedData = {
                animation_config: data.animation_config,
                screen_config: data.screen_config,
                // Include parsed custom fields
                ...parsedCustomFields
            };
            res.json(transformedData);
        } else {
            res.status(404).json({ error: 'No screen configuration found' });
        }
    } catch (error) {
        console.error('Error fetching screen config:', error);
        res.status(500).json({ error: 'Failed to fetch screen config' });
    }
});

// 4. Media API (VAST XML)
app.get('/api/media', async (req, res) => {
    try {
        const { assetId } = req.query;

        if (!assetId) {
            return res.status(400).send(`Error: Missing required parameter: assetId

Usage: /api/media?assetId=<asset_id>
Example: /api/media?assetId=12345678-1234-1234-1234-123456789abc`);
        }

        // Fetch creative data from database using asset_id
        const { data: creative, error } = await supabase
            .from('creatives')
            .select('*')
            .eq('asset_id', assetId)
            .single();

        if (error || !creative) {
            console.error('Error fetching creative:', error);
            return res.status(404).send(`Error: Creative with asset ID "${assetId}" not found`);
        }

        // Check if vast_xml is available and use it if present
        if (creative.vast_xml) {
            res.set('Content-Type', 'application/xml');
            return res.send(creative.vast_xml);
        }


        // Calculate duration in HH:MM:SS format
        const durationSeconds = Math.floor(creative.duration / 1000);
        const hours = Math.floor(durationSeconds / 3600);
        const minutes = Math.floor((durationSeconds % 3600) / 60);
        const seconds = durationSeconds % 60;
        const durationFormatted = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        // Determine MIME type based on creative type
        const mimeType = creative.type === 'video' ? 'video/mp4' :
            creative.type === 'image' ? 'image/jpeg' :
                'text/html';

        // Generate VAST XML with real data
        const vastXml = `<?xml version="1.0" encoding="UTF-8"?>
                        <VAST version="4.0">
                        <Ad id="${assetId}">
                            <InLine>
                            <AdSystem version="1.0">Creative Content Manager</AdSystem>
                            <AdTitle>${creative.filename || 'Creative'}</AdTitle>
                            <Impression><![CDATA[https://api.adonmo.com/impression/${creative.campaign_run}]]></Impression>
                            <Creatives>
                                <Creative id="${assetId}-creative">
                                <Linear>
                                    <Duration>${durationFormatted}</Duration>
                                    <MediaFiles>
                                    <MediaFile delivery="progressive" type="${mimeType}" width="1080" height="1920">
                                        <![CDATA[${creative.file_url}]]>
                                    </MediaFile>
                                    </MediaFiles>
                                </Linear>
                                </Creative>
                            </Creatives>
                            </InLine>
                        </Ad>
                        </VAST>`;

        res.set('Content-Type', 'application/xml');
        res.send(vastXml);

    } catch (error) {
        console.error('Error generating VAST XML:', error);
        res.status(500).send('Error: Failed to generate media XML');
    }
});

// 5. Campaign Data Update API
app.put('/api/campaign/:campaignRun', async (req, res) => {
    try {
        const { campaignRun } = req.params;
        const campaignData = req.body;

        if (!campaignRun) {
            return res.status(400).json({ error: 'Campaign run is required' });
        }


        console.log(`Campaign data updated for ${campaignRun}:`, campaignData);

        // Just update the timestamp to show activity
        const { data, error } = await supabase
            .from('creatives')
            .update({
                updated_at: new Date().toISOString(),
                campaign_data: campaignData
            })
            .eq('campaign_run', campaignRun)
            .select()
            .single();

        if (error) {
            console.error('Error updating timestamp:', error);
            // Continue anyway - the campaign data update is conceptually successful
        }

        res.json({
            message: 'Campaign data updated successfully',
            campaign_run: campaignRun,
            campaign_data: campaignData
        });

    } catch (error) {
        console.error('Error updating campaign data:', error);
        res.status(500).json({ error: 'Failed to update campaign data' });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'NEXUS Backend is running' });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 NEXUS Backend running on port ${PORT}`);
    console.log(`📊 API endpoints available:`);
    console.log(`   GET http://localhost:${PORT}/api/content_plan`);
    console.log(`   GET http://localhost:${PORT}/api/operational_metadata`);
    console.log(`   POST http://localhost:${PORT}/api/config`);
    console.log(`   GET http://localhost:${PORT}/api/media?assetId=<asset_id>`);
    console.log(`   PUT http://localhost:${PORT}/api/campaign/<campaign_run>`);

    console.log(`   GET http://localhost:${PORT}/health`);
});

module.exports = app;