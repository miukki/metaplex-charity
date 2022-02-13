import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Layout,
  Row,
  Col,
  Table,
  Switch,
  Spin,
  Modal,
  Button,
  Input,
  Divider,
  Select} from 'antd';

import debounce from 'lodash/debounce';
import AwesomeDebouncePromise from 'awesome-debounce-promise';
import { useMeta } from '../../contexts';
import {
  Store,
  WhitelistedCreator,
} from '@oyster/common/dist/lib/models/metaplex/index';
import {
  MasterEditionV1,
  notify,
  ParsedAccount,
  shortenAddress,
  StringPublicKey,
  useConnection,
  useStore,
  useUserAccounts,
  useWalletModal,
  WalletSigner,
} from '@oyster/common';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection } from '@solana/web3.js';
import { saveAdmin } from '../../actions/saveAdmin';
import {
  convertMasterEditions,
  filterMetadata,
} from '../../actions/convertMasterEditions';
import { Link } from 'react-router-dom';
import { SetupVariables } from '../../components/SetupVariables';
import { cacheAllAuctions } from '../../actions/cacheAllAuctions';
import { useAsync } from 'react-async-hook';
import useConstant from 'use-constant';

const { Content } = Layout;

export const AdminView = () => {
  const { store, whitelistedCreatorsByCreator, isLoading } = useMeta();
  const connection = useConnection();
  const wallet = useWallet();
  const { setVisible } = useWalletModal();
  const connect = useCallback(
    () => (wallet.wallet ? wallet.connect().catch() : setVisible(true)),
    [wallet.wallet, wallet.connect, setVisible],
  );
  const { storeAddress, setStoreForOwner, isConfigured } = useStore();

  useEffect(() => {
    if (
      !store &&
      !storeAddress &&
      wallet.publicKey &&
      !process.env.NEXT_PUBLIC_STORE_OWNER_ADDRESS
    ) {
      setStoreForOwner(wallet.publicKey.toBase58());
    }
  }, [store, storeAddress, wallet.publicKey]);
  console.log('@admin', wallet.connected, storeAddress, isLoading, store);

      const fetchCharities = async (search_term: string) => {
        console.log({search_term})


        const PK = process.env.REACT_APP_CHARITY_PK;
        const SK = process.env.REACT_APP_CHARITY_SK;
        
        const encodedString = new Buffer(`${PK}` + ':' + `${SK}`).toString('base64');

        console.log({encodedString})
        const headers = new Headers();
        headers.append("Content-Type", "application/json");
        headers.append("Authorization", `Basic ${encodedString}`);


        const response = await fetch(`https://api.getchange.io/api/v1/nonprofits?search_term=${search_term}&page=10`, {
          method: 'GET',
          headers,
        });
        const charities = await response?.json()
        console.log({charities})
        return charities

      }

  return (
    <>
      {!wallet.connected ? (
        <p>
          <Button type="primary" className="app-btn" onClick={connect}>
            Connect
          </Button>{' '}
          to admin store.
        </p>
      ) : !storeAddress || isLoading ? (
        <Spin />
      ) : store && wallet ? (
        <>
          <InnerAdminView
            fetchCharities={fetchCharities}
            store={store}
            whitelistedCreatorsByCreator={whitelistedCreatorsByCreator}
            connection={connection}
            wallet={wallet}
            connected={wallet.connected}
          />
          {!isConfigured && (
            <>
              <Divider />
              <Divider />
              <p>
                To finish initialization please copy config below into{' '}
                <b>packages/web/.env</b> and restart yarn or redeploy
              </p>
              <SetupVariables
                storeAddress={storeAddress}
                storeOwnerAddress={wallet.publicKey?.toBase58()}
              />
            </>
          )}
        </>
      ) : (
        <>
          <p>Store is not initialized</p>
          <Link to={`/`}>Go to initialize</Link>
        </>
      )}
    </>
  );
};

function ArtistModal({
  setUpdatedCreators,
  uniqueCreatorsWithUpdates,
}: {
  setUpdatedCreators: React.Dispatch<
    React.SetStateAction<Record<string, WhitelistedCreator>>
  >;
  uniqueCreatorsWithUpdates: Record<string, WhitelistedCreator>;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalAddress, setModalAddress] = useState<string>('');
  return (
    <>
      <Modal
        className={'modal-box'}
        title="Add New Artist Address or Charity"
        visible={modalOpen}
        onOk={() => {
          const addressToAdd = modalAddress;
          setModalAddress('');
          setModalOpen(false);

          if (uniqueCreatorsWithUpdates[addressToAdd]) {
            notify({
              message: 'Artist already added!',
              type: 'error',
            });
            return;
          }

          let address: StringPublicKey;
          try {
            address = addressToAdd;
            setUpdatedCreators(u => ({
              ...u,
              [modalAddress]: new WhitelistedCreator({
                address,
                activated: true,
              }),
            }));
          } catch {
            notify({
              message: 'Only valid Solana addresses are supported',
              type: 'error',
            });
          }
        }}
        onCancel={() => {
          setModalAddress('');
          setModalOpen(false);
        }}
      >
        <Input
          value={modalAddress}
          onChange={e => setModalAddress(e.target.value)}
        />
      </Modal>
      <Button onClick={() => setModalOpen(true)}>Add Creator or Charity</Button>
    </>
  );
}

// Generic reusable hook
const useDebouncedSearch = (searchFunction) => {

  // Handle the input text state
  const [inputText, setInputText] = useState('');

  // Debounce the original search async function
  const debouncedSearchFunction = useConstant(() =>
    AwesomeDebouncePromise(searchFunction, 300)
  );

  // The async callback is run each time the text changes,
  // but as the search function is debounced, it does not
  // fire a new request on each keystroke
  const searchResults = useAsync(
    async () => {
      if (inputText.length === 0) {
        return [];
      } else {
        return debouncedSearchFunction(inputText);
      }
    },
    [debouncedSearchFunction, inputText]
  );

  // Return everything needed for the hook consumer
  return {
    inputText,
    setInputText,
    searchResults,
  };
};

function InnerAdminView({
  store,
  whitelistedCreatorsByCreator,
  connection,
  wallet,
  connected,
  fetchCharities,
}: {
  store: ParsedAccount<Store>;
  whitelistedCreatorsByCreator: Record<
    string,
    ParsedAccount<WhitelistedCreator>
  >;
  connection: Connection;
  wallet: WalletSigner;
  connected: boolean;
  fetchCharities: any;
}) {
  const [newStore, setNewStore] = useState(
    store && store.info && new Store(store.info),
  );
  const [updatedCreators, setUpdatedCreators] = useState<
    Record<string, WhitelistedCreator>
  >({});
  const [filteredMetadata, setFilteredMetadata] =
    useState<{
      available: ParsedAccount<MasterEditionV1>[];
      unavailable: ParsedAccount<MasterEditionV1>[];
    }>();
  const [loading, setLoading] = useState<boolean>();
  const { metadata, masterEditions } = useMeta();
  const state = useMeta();

  const { accountByMint } = useUserAccounts();
  useMemo(() => {
    const fn = async () => {
      setFilteredMetadata(
        await filterMetadata(
          connection,
          metadata,
          masterEditions,
          accountByMint,
        ),
      );
    };
    fn();
  }, [connected]);

  const uniqueCreators = Object.values(whitelistedCreatorsByCreator).reduce(
    (acc: Record<string, WhitelistedCreator>, e) => {
      acc[e.info.address] = e.info;
      return acc;
    },
    {},
  );

  const uniqueCreatorsWithUpdates = { ...uniqueCreators, ...updatedCreators };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Address',
      dataIndex: 'address',
      render: (val: StringPublicKey) => <span>{val}</span>,
      key: 'address',
    },
    {
      title: 'Activated',
      dataIndex: 'activated',
      key: 'activated',
      render: (
        value: boolean,
        record: {
          address: StringPublicKey;
          activated: boolean;
          name: string;
          key: string;
        },
      ) => (
        <Switch
          checkedChildren="Active"
          unCheckedChildren="Inactive"
          checked={value}
          onChange={val =>
            setUpdatedCreators(u => ({
              ...u,
              [record.key]: new WhitelistedCreator({
                activated: val,
                address: record.address,
              }),
            }))
          }
        />
      ),
    },
  ];
 
  const useSearchStarwarsHero = () => useDebouncedSearch((text: string) => fetchCharities(text))
  const { inputText, setInputText, searchResults } = useSearchStarwarsHero();
 const [selectedCharity, setSelectedCharity] = React.useState(``);


  console.log({ loading: searchResults?.loading, result: searchResults?.result?.nonprofits, selectedCharity})


  return (
    <Content className={'admin-content'}>
      <Col style={{ marginTop: 10 }}>
        <Row>
          <Col span={21}>
            <ArtistModal
              setUpdatedCreators={setUpdatedCreators}
              uniqueCreatorsWithUpdates={uniqueCreatorsWithUpdates}
            />
            <Button
              onClick={async () => {
                notify({
                  message: 'Saving...',
                  type: 'info',
                });
                await saveAdmin(
                  connection,
                  wallet,
                  newStore.public,
                  Object.values(updatedCreators),
                );
                notify({
                  message: 'Saved',
                  type: 'success',
                });
              }}
              type="primary"
            >
              Submit
            </Button>
          </Col>
          <Col span={3}>
            <Switch
              checkedChildren="Public"
              unCheckedChildren="Whitelist Only"
              checked={newStore.public}
              onChange={val => {
                setNewStore(_ => {
                  const newS = new Store(store.info);
                  newS.public = val;
                  return newS;
                });
              }}
            />
          </Col>
        </Row>
        <Row>
          <Table
            className="artist-whitelist-table"
            columns={columns}
            dataSource={Object.keys(uniqueCreatorsWithUpdates).map(key => ({
              key,
              address: uniqueCreatorsWithUpdates[key].address,
              activated: uniqueCreatorsWithUpdates[key].activated,
              name:
                uniqueCreatorsWithUpdates[key].name ||
                shortenAddress(uniqueCreatorsWithUpdates[key].address),
              image: uniqueCreatorsWithUpdates[key].image,
            }))}
          ></Table>
        </Row>
      </Col>

      <div>

        <h1>Search charity</h1>{' '}
        <Input
        id="otp-text-field"
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        style={{ marginRight: 10, width: `20% ` }}
      />

        <Select
          onSelect={(sol, {key}) => {
           if (sol) {
             navigator.clipboard.writeText(`${sol}`)
             setSelectedCharity(sol);
           }
          }}
          value={selectedCharity}
          style={{ marginBottom: 20, width: `30% `, color: `black` }}
        >

          {(searchResults?.result?.nonprofits || []).map(({ name, crypto, id }) => (
            <Select.Option value={`${crypto?.solana_address}`} key={`${crypto?.solana_address}`} id={`${crypto?.solana_address}`}>
              {name}{` (${crypto?.solana_address})`}
            </Select.Option>
          ))}
        </Select>    
        {searchResults?.loading === true ? <span style={{paddingLeft: 10}}>loading...</span>:null}  
        {selectedCharity ? <span style={{paddingLeft: 10}}>Copied to clipboard: SOL {selectedCharity} </span>:null}  

      </div>


      {!store.info.public && (
        <>
          <h1>
            You have {filteredMetadata?.available.length} MasterEditionV1s that
            can be converted right now and{' '}
            {filteredMetadata?.unavailable.length} still in unfinished auctions
            that cannot be converted yet.
          </h1>
          <Col>
            <Row>
              <Button
                disabled={loading}
                onClick={async () => {
                  setLoading(true);
                  await convertMasterEditions(
                    connection,
                    wallet,
                    filteredMetadata?.available || [],
                    accountByMint,
                  );
                  setLoading(false);
                }}
              >
                {loading ? (
                  <Spin />
                ) : (
                  <span>Convert Eligible Master Editions</span>
                )}
              </Button>
            </Row>
          </Col>{' '}
        </>
      )}
      <Col>
        <p style={{'marginTop': '30px'}}>Upgrade the performance of your existing auctions.</p>
        <Row>
          <Button
            disabled={loading}
            onClick={async () => {
              setLoading(true);
              await cacheAllAuctions(wallet, connection, state);
              setLoading(false);
            }}
          >
            {loading ? <Spin /> : <span>Upgrade Auction Performance</span>}
          </Button>
        </Row>
      </Col>
    </Content>
  );
}
