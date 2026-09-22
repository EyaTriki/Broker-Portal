import { useCallback, useEffect, useState } from 'react';
import {
  Autocomplete,
  Button,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { AddressLookupOption, lookupPostcodeAddresses } from 'src/services/locationService';

export interface ResolvedAddress {
  addressLine1: string;
  addressLine2: string;
  city: string;
  postalCode: string;
  region: string;
  country: string;
}

interface PostcodeAddressLookupProps {
  postcode: string;
  onPostcodeChange: (postcode: string) => void;
  onAddressSelect: (address: ResolvedAddress) => void;
}

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: 2,
    bgcolor: '#fff',
  },
};

function normalizePostcode(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, ' ');
}

export default function PostcodeAddressLookup({
  postcode,
  onPostcodeChange,
  onAddressSelect,
}: PostcodeAddressLookupProps) {
  const [options, setOptions] = useState<AddressLookupOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<AddressLookupOption | null>(null);
  const [lookupMessage, setLookupMessage] = useState('');

  const runLookup = useCallback(async (rawPostcode: string) => {
    const normalized = normalizePostcode(rawPostcode);

    if (normalized.length < 3) {
      setOptions([]);
      setLookupMessage('');
      return;
    }

    setLoading(true);
    setLookupMessage('');

    const { addresses, error, suggestions } = await lookupPostcodeAddresses(rawPostcode);
    setOptions(addresses);
    setLoading(false);

    if (!addresses.length) {
      if (suggestions?.length) {
        setLookupMessage(`Postcode not found. Did you mean: ${suggestions.slice(0, 3).join(', ')}?`);
      } else {
        setLookupMessage(error || 'No addresses found. Check the postcode and try again.');
      }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const timeout = setTimeout(() => {
      if (cancelled) return;
      void runLookup(postcode);
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [postcode, runLookup]);

  const handlePostcodeChange = (value: string) => {
    setSelected(null);
    setLookupMessage('');
    onPostcodeChange(value);
  };

  const handleAddressSelect = (_: unknown, value: AddressLookupOption | null) => {
    setSelected(value);
    if (!value) return;

    onPostcodeChange(value.postcode);
    onAddressSelect({
      addressLine1: value.line1,
      addressLine2: value.line2,
      city: value.city,
      postalCode: value.postcode,
      region: value.region,
      country: value.country || 'United Kingdom',
    });
    setLookupMessage('');
  };

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
        <TextField
          label="Postcode"
          placeholder="Enter postcode to search"
          value={postcode}
          onChange={(e) => handlePostcodeChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void runLookup(postcode);
            }
          }}
          fullWidth
          size="small"
          InputLabelProps={{ shrink: true }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  edge="end"
                  aria-label="Search postcode"
                  onClick={() => void runLookup(postcode)}
                  disabled={loading}
                >
                  <SearchIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={fieldSx}
        />
        <Button
          variant="outlined"
          onClick={() => void runLookup(postcode)}
          disabled={loading}
          sx={{ minWidth: 96, borderRadius: 2 }}
        >
          Lookup
        </Button>
      </Stack>

      <Autocomplete
        openOnFocus
        options={options}
        loading={loading}
        value={selected}
        onChange={handleAddressSelect}
        getOptionLabel={(option) => option.label}
        isOptionEqualToValue={(a, b) => a.label === b.label && a.postcode === b.postcode}
        noOptionsText={
          loading
            ? 'Searching addresses…'
            : normalizePostcode(postcode).length >= 3
              ? 'No addresses found'
              : 'Enter a postcode above'
        }
        filterOptions={(x) => x}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Select address"
            placeholder="Choose an address from the list"
            size="small"
            InputLabelProps={{ shrink: true }}
            sx={fieldSx}
          />
        )}
      />

      {lookupMessage && (
        <Typography variant="caption" color="error">
          {lookupMessage}
        </Typography>
      )}
    </Stack>
  );
}
