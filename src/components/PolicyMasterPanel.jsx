import React from "react";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
import { styled } from "@mui/material/styles";
import { injectIntl } from "react-intl";
import {
  Paper,
  Grid,
  Typography,
  Divider,
  IconButton,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import { GetIconComponent, withModulesManager } from "@openimis/fe-core";
const RenewIcon = GetIconComponent("Autorenew")
const DeleteIcon = GetIconComponent("Delete")
const SuspendIcon = GetIconComponent("Pause")
import {
  formatMessage,
  formatMessageWithValues,
  withTooltip,
  historyPush,
  coreConfirm,
  journalize,
  FormattedMessage,
  FormPanel,
  Contributions,
  PublishedComponent,
  ProgressOrError,
  decodeId,
  AmountInput,
  TextInput,
  GRID_RESPONSIVE_STANDARD,
  GRID_RESPONSIVE_FULL,
} from "@openimis/fe-core";
import {
  policyLabel,
  canDeletePolicy,
  canSuspendPolicy,
  canRenewPolicy,
} from "../utils/utils";
import { deletePolicy, suspendPolicy } from "../actions";

const StyledPaper = styled(Paper)(({ theme }) => ({
  ...theme?.paper?.paper ?? {},
}));

const StyledTableTitle = styled('div')(({ theme }) => ({
  ...theme?.table?.title ?? {},
}));

const StyledItem = styled('div')(({ theme }) => ({
  ...theme?.paper?.item ?? {},
}));

const POLICY_POLICY_CONTRIBUTION_KEY = "policy.Policy";
const POLICY_POLICY_PANELS_CONTRIBUTION_KEY = "policy.Policy.panels";

/**
 * Wrapper component that conditionally renders either ProductPicker or ContributionPicker
 * based on the mode configuration
 */
const ProductOrContributionPicker = ({ 
  mode, 
  intl,
  value,
  readOnly,
  editedId,
  locationId,
  enrollmentDate,
  onProductChange,
  onContributionChange,
  required = true,
  ...otherProps 
}) => {
  const commonProps = {
    module: "policy",
    value,
    readOnly,
    withNull: true,
    withLabel: true,
    required,
    locationId,
    enrollmentDate,
    ...otherProps,
  };

  if (mode === "products") {
    return (
      <PublishedComponent
        pubRef="product.ProductPicker"
        {...commonProps}
        readOnly={!!editedId || readOnly}
        label={formatMessage(intl, "product", "Product")}
        nullLabel={formatMessage(intl, "product", "Product.none")}
        placeholder={formatMessage(intl, "product", "ProductPicker.placeholder")}
        onChange={onProductChange}
      />
    );
  }

  // Default: contributions mode
  return (
    <PublishedComponent
      pubRef="contribution.PremiumCategoryPicker"
      {...commonProps}
      readOnly={!!editedId || readOnly}
      label={formatMessage(intl, "contribution", "Contribution")}
      nullLabel={formatMessage(intl, "contribution", "Contribution.none")}
      placeholder={formatMessage(intl, "contribution", "ContributionPicker.placeholder")}
      onChange={onContributionChange}
    />
  );
};

class PolicyMasterPanel extends FormPanel {
  constructor(props) {
    super(props);
    this.productsOrContributions = this.props.modulesManager.getConf(
      "fe-policy",
      "productsOrContributions",
      "contributions"
    );
    this.minimumPolicyEffectiveDate = this.props.modulesManager.getConf(
      "fe-policy",
      "minimumPolicyEffectiveDate",
      0
    );
    this.defaultPaymentType = this.props.modulesManager.getConf(
      "fe-policy",
      "defaultPaymentTypeOfContribution",
      "C"
    );
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    if (!prevProps.confirmed && this.props.confirmed) {
      this.state.confirmedAction();
    } else if (prevProps.submittingMutation && !this.props.submittingMutation) {
      this.props.journalize(this.props.mutation);
      this.setState({ reset: this.state.reset + 1 });
    }
  }

  _onProductChange = (product) => {
    !product
      ? this.updateAttributes({
          product: null,
          startDate: null,
          expiryDate: null,
          value: null,
        })
      : this.updateAttribute("product", product);
  };

  _onContributionChange = (contribution) => {
    !contribution
      ? this.updateAttributes({
          contribution: null,
          startDate: null,
          expiryDate: null,
          value: null,
        })
      : this.updateAttribute("contribution", contribution);
  };

  renewPolicy = () =>
    historyPush(
      this.props.modulesManager,
      this.props.history,
      "policy.route.policy",
      [this.props.edited.uuid, this.props.edited.family.uuid, true]
    );

  confirmSuspend = () => {
    let policy = this.props.edited;
    let confirmedAction = () =>
      this.props.suspendPolicy(
        this.props.modulesManager,
        policy,
        formatMessageWithValues(
          this.props.intl,
          "policy",
          "SuspendPolicy.mutationLabel",
          { policy: policyLabel(this.props.modulesManager, policy) }
        )
      );
    let confirm = (e) =>
      this.props.coreConfirm(
        formatMessageWithValues(
          this.props.intl,
          "policy",
          "suspendPolicyDialog.title",
          { label: policyLabel(this.props.modulesManager, policy) }
        ),
        formatMessageWithValues(
          this.props.intl,
          "policy",
          "suspendPolicyDialog.message",
          {
            label: policyLabel(this.props.modulesManager, policy),
          }
        )
      );
    this.setState({ confirmedAction }, confirm);
  };

  confirmDelete = () => {
    let policy = this.props.edited;
    let confirmedAction = () =>
      this.props.deletePolicy(
        this.props.modulesManager,
        policy,
        formatMessageWithValues(
          this.props.intl,
          "policy",
          "DeletePolicy.mutationLabel",
          { policy: policyLabel(this.props.modulesManager, policy) }
        )
      );
    let confirm = (e) =>
      this.props.coreConfirm(
        formatMessageWithValues(
          this.props.intl,
          "policy",
          "deletePolicyDialog.title",
          { label: policyLabel(this.props.modulesManager, policy) }
        ),
        formatMessageWithValues(
          this.props.intl,
          "policy",
          "deletePolicyDialog.message",
          {
            label: policyLabel(this.props.modulesManager, policy),
          }
        )
      );
    this.setState({ confirmedAction }, confirm);
  };

  canDelete = (policy) => canDeletePolicy(this.props.rights, policy);
  canSuspend = (policy) => canSuspendPolicy(this.props.rights, policy);
  canRenew = (policy) =>
    !this.props.renew && canRenewPolicy(this.props.rights, policy);

  render() {
    const {
      intl,
      edited,
      edited_id,
      readOnly,
      fetchingPolicyValues,
      errorPolicyValues,
      title = "Policy.details.title",
    } = this.props;

    let actions = [];
    if (this.canRenew(edited)) {
      actions.push({
        button: (
          <IconButton onClick={(e) => this.renewPolicy()}>
            <RenewIcon />
          </IconButton>
        ),
        tooltip: formatMessage(
          this.props.intl,
          "policy",
          "action.RenewPolicy.tooltip"
        ),
      });
    }
    if (this.canSuspend(edited)) {
      actions.push({
        button: (
          <IconButton onClick={(e) => this.confirmSuspend()}>
            <SuspendIcon />
          </IconButton>
        ),
        tooltip: formatMessage(
          this.props.intl,
          "policy",
          "action.SuspendPolicy.tooltip"
        ),
      });
    }
    if (this.canDelete(edited)) {
      actions.push({
        button: (
          <IconButton onClick={(e) => this.confirmDelete()}>
            <DeleteIcon />
          </IconButton>
        ),
        tooltip: formatMessage(
          this.props.intl,
          "policy",
          "action.DeletePolicy.tooltip"
        ),
      });
    }

    return (
      <Grid container spacing={2}>
        <Grid size={GRID_RESPONSIVE_FULL}>
          <StyledPaper>
            <Grid container component={StyledTableTitle} spacing={1}>
              <Grid size={GRID_RESPONSIVE_STANDARD} component={StyledTableTitle}>
                <Typography>
                  <FormattedMessage module="policy" id={title} />
                </Typography>
              </Grid>
              <Grid size={9}>
                <Grid container justifyContent="flex-end">
                  {!!actions &&
                    actions.map((a, idx) => {
                      return (
                        <Grid
                          item
                          key={`form-action-${idx}`}
                          className="paperHeaderAction"
                        >
                          {withTooltip(a.button, a.tooltip)}
                        </Grid>
                      );
                    })}
                </Grid>
              </Grid>
            </Grid>
            <Divider />
            <Grid container component={StyledItem} spacing={2}>
              <Grid size={GRID_RESPONSIVE_STANDARD} component={StyledItem}>
                <PublishedComponent
                  pubRef="core.DatePicker"
                  value={!!edited ? edited.enrollDate : null}
                  module="policy"
                  label="Policy.enrollDate"
                  minDate={
                    !!this.minimumPolicyEffectiveDate
                      ? new Date().setDate(
                          new Date().getDate() - this.minimumPolicyEffectiveDate
                        )
                      : undefined
                  }
                  maxDate={new Date()}
                  readOnly={readOnly}
                  required={true}
                  onChange={(v) => this.updateAttribute("enrollDate", v)}
                />
              </Grid>
              <Grid size={GRID_RESPONSIVE_STANDARD} component={StyledItem}>
                <PublishedComponent
                  pubRef="core.DatePicker"
                  value={!!edited ? edited.effectiveDate : null}
                  module="policy"
                  label="Policy.effectiveDate"
                  readOnly={true}
                  required={false}
                />
              </Grid>
              {!!fetchingPolicyValues && (
                <Grid size={GRID_RESPONSIVE_STANDARD} component={StyledItem}>
                  <ProgressOrError
                    progress={fetchingPolicyValues}
                    error={errorPolicyValues}
                  />
                </Grid>
              )}
              {!fetchingPolicyValues &&
                ["startDate", "expiryDate"].map((date) => (
                  <Grid
                    key={`policy-${date}`}
                    item
                    size={GRID_RESPONSIVE_STANDARD}
                    component={StyledItem}
                  >
                    <PublishedComponent
                      pubRef="core.DatePicker"
                      value={!!edited ? edited[date] : null}
                      module="policy"
                      label={`Policy.${date}`}
                      readOnly={true}
                    />
                  </Grid>
                ))}
              <Grid size={GRID_RESPONSIVE_STANDARD} component={StyledItem}>
                <ProductOrContributionPicker
                  mode={this.productsOrContributions}
                  intl={intl}
                  value={!!edited && (this.productsOrContributions === "products" ? edited.product : edited.contribution)}
                  readOnly={readOnly}
                  editedId={edited_id}
                  locationId={
                    !!edited.family
                      ? decodeId(edited.family?.location?.parent?.parent?.id)
                      : 0
                  }
                  enrollmentDate={edited?.enrollDate ?? null}
                  onProductChange={this._onProductChange}
                  onContributionChange={this._onContributionChange}
                  required={true}
                />
              </Grid>
              <Grid size={GRID_RESPONSIVE_STANDARD} component={StyledItem}>
                <PublishedComponent
                  pubRef="policy.PolicyOfficerPicker"
                  value={!!edited && edited.officer}
                  module="policy"
                  readOnly={readOnly}
                  withPlaceholder={true}
                  withLabel={true}
                  label={formatMessage(
                    intl,
                    "policy",
                    "PolicyOfficerPicker.label"
                  )}
                  placeholder={formatMessage(
                    intl,
                    "policy",
                    "PolicyOfficerPicker.placeholder"
                  )}
                  withNull={true}
                  nullLabel={formatMessage(
                    intl,
                    "policy",
                    "PolicyOfficer.none"
                  )}
                  onChange={(v) => this.updateAttribute("officer", v)}
                  required={true}
                  villageId={
                    !!edited.family ? decodeId(edited.family?.location?.id) : 0
                  }
                />
              </Grid>
              <Grid size={GRID_RESPONSIVE_STANDARD} component={StyledItem}>
                <PublishedComponent
                  pubRef="policy.PolicyStatusPicker"
                  value={!!edited && edited.status}
                  module="policy"
                  readOnly={true}
                  withNull={false}
                  onChange={(v) => this.updateAttribute("status", v)}
                />
              </Grid>
              {!edited_id && (
                <Grid size={GRID_RESPONSIVE_FULL}>
                  <Grid size={GRID_RESPONSIVE_STANDARD} component={StyledItem}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          color="primary"
                          checked={edited?.isPaid}
                          onChange={(e) =>
                            this.updateAttribute("isPaid", e.target.checked)
                          }
                        />
                      }
                      disabled={readOnly}
                      label={formatMessage(
                        intl,
                        "policy",
                        "Policy.payInOneInstallment"
                      )}
                    />
                  </Grid>
                </Grid>
              )}
              {edited?.isPaid && (
                <>
                  <Grid size={GRID_RESPONSIVE_FULL} component={StyledItem}>
                    <Typography variant="subtitle1">
                      <FormattedMessage
                        module="policy"
                        id="Policy.contribDetails"
                      />
                    </Typography>
                    <i>
                      <Typography variant="body2">
                        <FormattedMessage
                          module="policy"
                          id="Policy.contribDetails.warning"
                        />
                      </Typography>
                    </i>
                  </Grid>
                  <Grid size={GRID_RESPONSIVE_STANDARD} component={StyledItem}>
                    <TextInput
                      module="contribution"
                      label="contribution.receipt"
                      readOnly={readOnly}
                      value={edited?.receipt}
                      onChange={(receipt) =>
                        this.updateAttribute("receipt", receipt)
                      }
                    />
                  </Grid>
                  <Grid size={GRID_RESPONSIVE_STANDARD} component={StyledItem}>
                    <PublishedComponent
                      pubRef="payer.PayerPicker"
                      withNull={true}
                      readOnly={readOnly}
                      value={edited?.payer}
                      onChange={(p) => this.updateAttribute("payer", p)}
                    />
                  </Grid>
                  <Grid size={GRID_RESPONSIVE_STANDARD} component={StyledItem}>
                    <PublishedComponent
                      pubRef="core.DatePicker"
                      module="contribution"
                      value={edited?.enrollDate}
                      readOnly
                      label="contribution.payDate"
                    />
                  </Grid>
                  <Grid size={GRID_RESPONSIVE_STANDARD} component={StyledItem}>
                    <AmountInput
                      module="contribution"
                      label="contribution.amount"
                      readOnly
                      value={edited?.value || 0}
                      displayZero={true}
                    />
                  </Grid>
                  <Grid size={GRID_RESPONSIVE_STANDARD} component={StyledItem}>
                    <PublishedComponent
                      pubRef="contribution.PremiumPaymentTypePicker"
                      withNull={false}
                      readOnly
                      value={this.defaultPaymentType}
                    />
                  </Grid>
                </>
              )}
              <Contributions
                {...this.props}
                updateAttribute={this.updateAttribute}
                contributionKey={POLICY_POLICY_CONTRIBUTION_KEY}
              />
            </Grid>
          </StyledPaper>
          <Contributions
            {...this.props}
            updateAttribute={this.updateAttribute}
            contributionKey={POLICY_POLICY_PANELS_CONTRIBUTION_KEY}
          />
        </Grid>
      </Grid>
    );
  }
}

const mapStateToProps = (state) => ({
  rights:
    !!state.core && !!state.core.user && !!state.core.user.i_user
      ? state.core.user.i_user.rights
      : [],
  fetchingPolicyValues: state.policy.fetchingPolicyValues,
  errorPolicyValues: state.policy.errorPolicyValues,
  confirmed: state.core.confirmed,
  submittingMutation: state.policy.submittingMutation,
  mutation: state.policy.mutation,
});

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators(
    { deletePolicy, suspendPolicy, coreConfirm, journalize },
    dispatch
  );
};

export { StyledPaper };
export { PolicyMasterPanel };
export default withModulesManager(
  injectIntl(
    connect(mapStateToProps, mapDispatchToProps)(PolicyMasterPanel)
  )
);
