import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { PublishedComponent, graphql } from '@openimis/fe-core';
import { districtLocationId } from '../../utils';

export default function EnrollmentDistrictPicker({ value, onChange, readOnly }) {
  const dispatch = useDispatch();
  const [location, setLocation] = useState(null);

  useEffect(() => {
    let active = true;
    const id = districtLocationId(value);
    if (!id) {
      setLocation(null);
      return () => { active = false; };
    }
    if (districtLocationId(location?.id) !== id) {
      setLocation(null);
      dispatch(graphql(
        `{ locations(id: "${btoa(`LocationGQLType:${id}`)}", type: "R", first: 1) { edges { node { id uuid code name type } } } }`,
        'ENROLLMENT_DISTRICT_LOOKUP',
      )).then((response) => {
        if (active && !response?.error && !response?.payload?.errors?.length) {
          setLocation(response?.payload?.data?.locations?.edges?.[0]?.node ?? null);
        }
      }).catch(() => { if (active) setLocation(null); });
    }
    return () => { active = false; };
  }, [value, dispatch]);

  return (
    <PublishedComponent
      pubRef="location.MwDistrictPicker"
      multiple={false}
      value={location}
      readOnly={readOnly}
      onChange={(selected) => {
        setLocation(selected);
        onChange(selected ? districtLocationId(selected.id) : '');
      }}
    />
  );
}
