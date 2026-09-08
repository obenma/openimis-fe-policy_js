import React, { useState, useMemo, useEffect } from "react";
import { Autocomplete, useModulesManager, useTranslations } from "@openimis/fe-core";
import { useContributionPlanQuery } from "../hooks";
import _debounce from "lodash/debounce";
import _ from "lodash";

const PolicyContributionPlanPicker = (props) => {
  const {
    multiple,
    required,
    placeholder,
    label,
    withLabel,
    withPlaceholder,
    readOnly,
    value,
    onChange,
    filter,
    filterSelectedOptions,
  } = props;

  const modulesManager = useModulesManager();
  const { formatMessage } = useTranslations("policy", modulesManager);

  const [filters, setFilters] = useState({ applyDefaultValidityFilter: true });
  const [open, setOpen] = useState(false);

  const { isLoading, error, data } = useContributionPlanQuery(
    { filters },
    { skip: !open }
  );

  const onOpen = () => {
    setOpen(true);
    setFilters({ first: 15, applyDefaultValidityFilter: true });
  };

  const onClose = () => {
    setOpen(false);
  };

  const debouncedSetFilters = useMemo(
    () =>
      _debounce((search) => {
        setFilters({
          first: 15,
          search,
          applyDefaultValidityFilter: true,
          isDeleted: false,
        });
      }, 300),
    []
  );

  useEffect(() => {
    return () => {
      debouncedSetFilters.cancel();
    };
  }, [debouncedSetFilters]);

  const options = _.map(data?.contributionPlan?.edges ?? [], "node");

  return (
    <Autocomplete
      multiple={multiple}
      required={required}
      error={error}
      placeholder={placeholder ?? formatMessage("ProductPicker.placeholder")}
      label={label ?? formatMessage("ContributionPlan")}
      withLabel={withLabel}
      withPlaceholder={withPlaceholder}
      readOnly={readOnly}
      options={options}
      isLoading={isLoading}
      value={value}
      getOptionLabel={(option) => `${option?.code ?? ""} ${option?.name ?? ""}`}
      onChange={(value) =>
        onChange(value, value ? `${option?.code ?? ""} ${option?.name ?? ""}` : null)
      }
      onOpen={onOpen}
      onClose={onClose}
      filterOptions={filter}
      filterSelectedOptions={filterSelectedOptions}
      onInputChange={(search) => debouncedSetFilters(search)}
    />
  );
};

export default PolicyContributionPlanPicker;