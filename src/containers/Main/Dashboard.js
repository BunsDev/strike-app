/* eslint-disable no-useless-escape */
import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { compose } from 'recompose';
import { withRouter } from 'react-router-dom';
import { bindActionCreators } from 'redux';
import MainLayout from 'containers/Layout/MainLayout';
import Overview from 'components/Dashboard/Overview';
import Market from 'components/Dashboard/Market';
import SupplyCard from 'components/Dashboard/SupplyCard';
import { connectAccount, accountActionCreators } from 'core';
import LoadingSpinner from 'components/Basic/LoadingSpinner';
import { Row, Column } from 'components/Basic/Style';
import Toggle from 'components/Basic/Toggle';
import { Tooltip } from 'antd';
import { Label } from 'components/Basic/Label';
import IconQuestion from 'assets/img/question.png';
import BigNumber from 'bignumber.js';
import * as constants from 'utilities/constants';

const DashboardWrapper = styled.div`
  height: 100%;

  .apy-toggle {
    margin: 10px 15px;
    display: flex;
    align-items: center;
    justify-content: flex-end;

    .toggel-label {
      margin: 5px 10px;
    }
  }
`;

const SQuestion = styled.img`
  margin: 0px 20px 0px 10px;
  @media only screen and (max-width: 768px) {
    width: 15px;
    height: 15px;
  }
`;

function Dashboard({ settings, setSetting }) {
  const [currentMarket, setCurrentMarket] = useState('');
  const [withSTRK, setWithSTRK] = useState(true);

  useEffect(() => {
    setCurrentMarket('supply');
  }, []);

  useEffect(() => {
    setSetting({
      withSTRK
    });
  }, [withSTRK]);

  return (
    <MainLayout title="Dashboard">
      <DashboardWrapper className="flex">
        <Row>
          <Column xs="12">
            <div className="apy-toggle">
              <Label size="14" primary className="toggel-label">
                <div className="flex align-center">
                  <p className="pointer">
                    APY with Strike&nbsp;
                    <Tooltip
                      placement="bottom"
                      title={
                        <span>
                          Choose whether to include the STRK distribution APR in
                          calculations
                        </span>
                      }
                    >
                      <SQuestion src={IconQuestion} />
                    </Tooltip>
                  </p>
                </div>
              </Label>
              <Toggle
                checked={withSTRK}
                onChecked={() => setWithSTRK(!withSTRK)}
              />
            </div>
          </Column>
          <Column xs="12">
            <Overview currentMarket={currentMarket} />
          </Column>
          <Column xs="12">
            <Row>
              <Column xs="12">
                <Market
                  currentMarket={currentMarket}
                  setCurrentMarket={setCurrentMarket}
                />
              </Column>
              <Column xs="12">
                <SupplyCard currentMarket={currentMarket} />
              </Column>
            </Row>
          </Column>
        </Row>
      </DashboardWrapper>
    </MainLayout>
  );
}

Dashboard.propTypes = {
  history: PropTypes.object,
  settings: PropTypes.object,
  setSetting: PropTypes.func.isRequired
};

Dashboard.defaultProps = {
  history: {},
  settings: {}
};

const mapStateToProps = ({ account }) => ({
  settings: account.setting
});

const mapDispatchToProps = dispatch => {
  const { setSetting } = accountActionCreators;

  return bindActionCreators(
    {
      setSetting
    },
    dispatch
  );
};

export default compose(
  withRouter,
  connectAccount(mapStateToProps, mapDispatchToProps)
)(Dashboard);
